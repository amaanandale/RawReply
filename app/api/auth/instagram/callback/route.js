import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createAccessToken } from "@/lib/auth/tokens";
import { setAuthCookies } from "@/lib/auth/cookies";
import {
  getInstagramRedirectUri,
  META_DEFAULT_APP_ID,
  META_DEFAULT_APP_SECRET,
} from "@/lib/meta/constants";
import {
  validateAndConsumeOAuthState,
  STATE_COOKIE_NAME,
} from "@/lib/meta/oauth-state";
import {
  exchangeInstagramDirectCode,
  exchangeInstagramLongLivedToken,
  fetchInstagramDirectProfile,
  fetchInstagramDirectMedia,
} from "@/lib/meta/client";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";

/**
 * GET /api/auth/instagram/callback
 * Handles the OAuth callback from https://www.instagram.com/oauth/authorize:
 * 1. Strips any trailing #_ from authorization code.
 * 2. Validates state and resolves user identity / organization context from session or signed state.
 * 3. Exchanges code for short-lived token via api.instagram.com/oauth/access_token.
 * 4. Exchanges for 60-day long-lived token via graph.instagram.com/access_token.
 * 5. Fetches profile and initial media from graph.instagram.com.
 * 6. Saves account with login_provider='instagram' with AES-256-GCM encryption.
 * 7. Returns popup postMessage completion script with automatic redirect fallback to /dashboard/accounts.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get("code");
  // 1. Strip trailing #_ or #_=_ from code if returned by Instagram
  const code = rawCode ? String(rawCode).replace(/#_.*$/, "").replace(/#_$/, "") : null;
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");
  const errorDescription = searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsRedirectUrl = new URL("/dashboard/accounts", appUrl);

  function redirectWithClearedCookie(url) {
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE_NAME);
    return res;
  }

  /**
   * Returns a polished HTML page that broadcasts completion via localStorage and postMessage,
   * cleanly updates the parent RawReply dashboard, and closes the popup window without trapping the user.
   */
  function popupResponse({ success, username, platform = "instagram", error, accessTokenToSync }) {
    const data = JSON.stringify({
      type: "META_OAUTH_COMPLETE",
      success: Boolean(success),
      username: username || null,
      platform,
      error: error || null,
      timestamp: Date.now(),
    });

    const targetUrl = `${appUrl}/dashboard/accounts?connected=1`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RawReply — ${success ? "Instagram Connected" : "Connection Failed"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2rem 1.75rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }
    .icon-success {
      background: #ecfdf5;
      color: #059669;
    }
    .icon-error {
      background: #fef2f2;
      color: #dc2626;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #0f172a;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.25rem;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      font-size: 0.8125rem;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: #059669;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #047857;
    }
    .link {
      display: inline-block;
      margin-top: 0.875rem;
      font-size: 0.75rem;
      color: #64748b;
      text-decoration: underline;
      cursor: pointer;
    }
    .link:hover { color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    ${success ? `
      <div class="icon icon-success">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h2>Instagram Connected!</h2>
      <p>Your Instagram Professional account was connected successfully.</p>
      ${username ? `<div class="badge">@${username}</div>` : ""}
      <button class="btn btn-primary" onclick="handleClose()">Close Window</button>
      <a class="link" onclick="handleDashboard()">Return to Dashboard</a>
    ` : `
      <div class="icon icon-error">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <h2>Connection Incomplete</h2>
      <p>${error || "Failed to connect Instagram account. Please try again."}</p>
      <button class="btn btn-primary" onclick="handleClose()">Close Window</button>
      <a class="link" onclick="handleDashboard()">Return to Dashboard</a>
    `}
  </div>

  <script>
    var msg = ${data};
    var targetUrl = "${targetUrl}";

    // 1. Broadcast via localStorage (always reaches parent window even if opener was severed)
    try {
      localStorage.setItem("rawreply_oauth_complete", JSON.stringify(msg));
    } catch(e) {}

    // 2. Direct postMessage to window.opener if accessible
    if (window.opener && typeof window.opener.postMessage === "function") {
      try { window.opener.postMessage(msg, window.location.origin); } catch(e) {
        try { window.opener.postMessage(msg, "*"); } catch(e2) {}
      }
    }

    // 3. Attempt graceful automatic window.close
    setTimeout(function() {
      try { window.close(); } catch(e) {}
    }, 1200);

    function handleClose() {
      try { window.close(); } catch(e) {}
      setTimeout(function() {
        window.location.replace(targetUrl);
      }, 300);
    }

    function handleDashboard() {
      window.location.replace(targetUrl);
    }
  </script>
</body>
</html>`;

    const res = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    res.cookies.delete(STATE_COOKIE_NAME);
    if (accessTokenToSync) {
      setAuthCookies(res, { accessToken: accessTokenToSync });
    }
    return res;
  }

  let isPopupFlow = false;

  // Check for OAuth cancellation or denial
  if (errorParam) {
    const msg = errorDescription || errorReason || "Instagram authorization was cancelled or denied.";
    try {
      const cv = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;
      if (cv) {
        const raw = Buffer.from(cv, "base64url").toString("utf8");
        const { payload } = JSON.parse(raw);
        const parsed = JSON.parse(payload);
        if (parsed.popup) isPopupFlow = true;
      }
    } catch {}

    if (isPopupFlow) {
      return popupResponse({ success: false, error: msg });
    }

    accountsRedirectUrl.searchParams.set("error", "oauth_denied");
    accountsRedirectUrl.searchParams.set("message", msg);
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 2. Resolve session (if available) and validate state
  const session = await getCurrentSession(req);
  const cookieValue = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;

  const validation = await validateAndConsumeOAuthState({
    stateParam,
    cookieValue,
    sessionOrgId: session?.organizationId,
    sessionUser: session?.user,
  });

  if (!validation.valid) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "InstagramDirectCallback",
        action: "state_validation_rejected",
        code: validation.code,
        error: validation.error,
        timestamp: new Date().toISOString(),
      })
    );
    if (validation.popup) {
      return popupResponse({
        success: false,
        error: validation.error || "OAuth state verification failed. Please try connecting again.",
      });
    }
    accountsRedirectUrl.searchParams.set("error", validation.code || "invalid_state");
    accountsRedirectUrl.searchParams.set("message", validation.error || "State verification failed.");
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  isPopupFlow = Boolean(validation.popup);

  if (!code) {
    if (isPopupFlow) {
      return popupResponse({ success: false, error: "Missing authorization code from Instagram." });
    }
    accountsRedirectUrl.searchParams.set("error", "missing_code");
    accountsRedirectUrl.searchParams.set("message", "Missing authorization code from Instagram.");
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 3. Resolve Organization and User IDs safely from session or validated state payload
  const organizationId = session?.organizationId || validation.organizationId;
  const activeUserId = session?.user?.id || validation.userId;

  if (!organizationId) {
    if (isPopupFlow) {
      return popupResponse({ success: false, error: "Active organization context could not be resolved." });
    }
    accountsRedirectUrl.searchParams.set("error", "unauthorized_organization");
    accountsRedirectUrl.searchParams.set("message", "Active organization context could not be resolved.");
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  const redirectUri = getInstagramRedirectUri(req);

  try {
    // 4. Exchange code for short-lived token via api.instagram.com/oauth/access_token
    const shortLivedData = await exchangeInstagramDirectCode({ code, redirectUri });
    const shortLivedToken = shortLivedData.access_token;
    const directUserId = shortLivedData.user_id;

    // 5. Exchange short-lived token for 60-day long-lived token via graph.instagram.com/access_token
    const longLivedResponse = await exchangeInstagramLongLivedToken({ shortLivedToken });
    const longLivedToken = longLivedResponse.access_token;
    const expiresInSeconds = longLivedResponse.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 6. Fetch profile details from graph.instagram.com/me
    let profile = {};
    try {
      profile = await fetchInstagramDirectProfile({ accessToken: longLivedToken });
    } catch (profileErr) {
      console.warn("[InstagramCallback] Profile fetch fallback note:", profileErr.message);
    }

    const resolvedId = String(profile.user_id || profile.id || directUserId);
    const resolvedUsername = profile.username || `ig_user_${resolvedId}`;
    const resolvedName = profile.name || resolvedUsername;
    const profilePictureUrl = profile.profile_picture_url || null;

    // 7. Enforce 4 connected accounts limit
    const existingAccounts = await accountStore.listAccounts(organizationId);
    const isAlreadyConnected = existingAccounts.some(
      (a) => a.id === resolvedId || a.instagramBusinessId === resolvedId
    );
    if (!isAlreadyConnected && existingAccounts.length >= 4) {
      if (isPopupFlow) {
        return popupResponse({
          success: false,
          error: "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first.",
        });
      }
      accountsRedirectUrl.searchParams.set("error", "account_limit_reached");
      accountsRedirectUrl.searchParams.set(
        "message",
        "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first."
      );
      return redirectWithClearedCookie(accountsRedirectUrl.toString());
    }

    // 8. Save account in AccountStore with AES-256-GCM encryption and login_provider = 'instagram'
    await accountStore.saveAccount({
      organizationId,
      platform: "instagram",
      loginProvider: "instagram",
      login_provider: "instagram",
      id: resolvedId,
      instagramBusinessId: resolvedId,
      username: resolvedUsername,
      name: resolvedName,
      profilePictureUrl,
      accountType: "BUSINESS",
      pageId: null,
      pageName: null,
      accessToken: longLivedToken,
      pageToken: longLivedToken,
      tokenExpiresAt,
    });

    // 9. Sync initial recent media from graph.instagram.com/me/media
    try {
      const mediaResult = await fetchInstagramDirectMedia({
        accessToken: longLivedToken,
        limit: 24,
      });
      if (mediaResult && mediaResult.data && mediaResult.data.length > 0) {
        await db.saveInstagramMedia(mediaResult.data, organizationId, resolvedId);
      }
    } catch (mediaSyncErr) {
      console.warn("[InstagramCallback] Initial media sync note:", mediaSyncErr.message);
    }

    console.log(
      JSON.stringify({
        level: "info",
        service: "InstagramDirectCallback",
        action: "direct_instagram_account_connected",
        organizationId,
        instagramBusinessId: resolvedId,
        username: resolvedUsername,
        timestamp: new Date().toISOString(),
      })
    );

    // Prepare fresh session token to restore auth cookies if needed
    let freshAccessToken = null;
    if (activeUserId) {
      try {
        freshAccessToken = await createAccessToken({
          userId: activeUserId,
          sessionId: session?.sessionId || `ses_${Date.now()}`,
          orgId: organizationId,
          role: session?.role || "owner",
          isSuperAdmin: Boolean(session?.isSuperAdmin),
        });
      } catch (tokenErr) {
        console.warn("[InstagramCallback] Session token generation note:", tokenErr.message);
      }
    }

    // Always return the enhanced popupResponse with postMessage + redirect fallback
    return popupResponse({
      success: true,
      username: resolvedUsername,
      platform: "instagram",
      accessTokenToSync: freshAccessToken,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "InstagramDirectCallback",
        action: "callback_exception",
        error: err.message,
        timestamp: new Date().toISOString(),
      })
    );

    if (isPopupFlow) {
      return popupResponse({
        success: false,
        error: err.message || "Failed to complete Instagram account connection.",
      });
    }

    accountsRedirectUrl.searchParams.set("error", "connection_failed");
    accountsRedirectUrl.searchParams.set(
      "message",
      err.message || "Failed to complete Instagram account connection."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }
}
