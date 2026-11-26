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
   * Returns a lightweight HTML page that sends postMessage to window.opener,
   * closes the window, and gracefully redirects to /dashboard/accounts?connected=1
   * if the window opener is null (e.g. severed cross-origin opener on Instagram or mobile).
   */
  function popupResponse({ success, username, platform = "instagram", error, accessTokenToSync }) {
    const data = JSON.stringify({
      type: "META_OAUTH_COMPLETE",
      success: Boolean(success),
      username: username || null,
      platform,
      error: error || null,
    });

    const targetUrl = `${appUrl}/dashboard/accounts?connected=1`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>RawReply — Connecting Instagram...</title>
  <meta http-equiv="refresh" content="2;url=/dashboard/accounts?connected=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #334155;
      text-align: center;
      padding: 1.5rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #059669;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h3 style="margin:0 0 0.5rem;font-size:1.1rem;color:#0f172a;">
    ${success ? "Instagram Account Connected!" : "Connecting Account..."}
  </h3>
  <p style="margin:0 0 1rem;font-size:0.875rem;color:#64748b;">
    ${success ? "Returning you to your RawReply dashboard..." : (error || "Finishing connection...")}
  </p>
  <script>
  (function(){
    var msg = ${data};
    var origin = window.location.origin;
    var targetUrl = "${targetUrl}";

    var messageSent = false;
    if (window.opener && typeof window.opener.postMessage === "function") {
      try {
        window.opener.postMessage(msg, origin);
        messageSent = true;
      } catch(e) {
        try {
          window.opener.postMessage(msg, "*");
          messageSent = true;
        } catch(e2) {}
      }
    }

    if (messageSent) {
      setTimeout(function(){
        try { window.close(); } catch(e) {}
        setTimeout(function(){ window.location.replace(targetUrl); }, 300);
      }, 500);
    } else {
      setTimeout(function(){
        window.location.replace(targetUrl);
      }, 300);
    }
  })();
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
