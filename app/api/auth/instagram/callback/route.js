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
 * 2. Exchanges code for short-lived token via api.instagram.com/oauth/access_token.
 * 3. Exchanges for 60-day long-lived token via graph.instagram.com/access_token.
 * 4. Fetches profile and media from graph.instagram.com.
 * 5. Saves account with login_provider='instagram' and returns popup postMessage response.
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

  function popupResponse({ success, username, platform = "instagram", error }) {
    const data = JSON.stringify({
      type: "META_OAUTH_COMPLETE",
      success: Boolean(success),
      username: username || null,
      platform,
      error: error || null,
    });

    const html = `<!DOCTYPE html>
<html><head><title>RawReply — Connecting Instagram...</title></head>
<body>
<p style="font-family:Inter,system-ui,sans-serif;text-align:center;padding:2rem;color:#667085;">
  ${success ? "Instagram connected! This window will close automatically." : "Connection failed. This window will close automatically."}
</p>
<script>
(function(){
  try {
    var msg = ${data};
    if (window.opener && typeof window.opener.postMessage === "function") {
      window.opener.postMessage(msg, "${appUrl}");
    }
  } catch(e) {}
  setTimeout(function(){ window.close(); }, 600);
})();
</script>
</body></html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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

  // 2. Validate OAuth state
  const session = await getCurrentSession(req);
  const cookieValue = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;

  const validation = await validateAndConsumeOAuthState({
    stateParam,
    cookieValue,
    sessionOrgId: session?.organizationId,
    sessionUser: session?.user,
  });

  if (!validation.valid) {
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
      return popupResponse({ success: false, error: "Missing authorization code from Instagram callback." });
    }
    accountsRedirectUrl.searchParams.set("error", "missing_code");
    accountsRedirectUrl.searchParams.set("message", "Missing authorization code from Instagram.");
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  const { organizationId } = validation;
  const redirectUri = getInstagramRedirectUri(req);

  try {
    // 3. Exchange code for short-lived access token via api.instagram.com
    const shortLivedTokenResponse = await exchangeInstagramDirectCode({
      code,
      redirectUri,
    });
    const shortLivedToken = shortLivedTokenResponse.access_token;
    const directUserId = shortLivedTokenResponse.user_id;

    // 4. Exchange short-lived token for 60-day long-lived token via graph.instagram.com
    const longLivedResponse = await exchangeInstagramLongLivedToken({
      shortLivedToken,
    });
    const longLivedToken = longLivedResponse.access_token;
    const expiresInSeconds = longLivedResponse.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 5. Fetch profile details from graph.instagram.com/me
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

    // 6. Enforce 4-account limit
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

    // 7. Save account in AccountStore with AES-256-GCM encryption and login_provider = 'instagram'
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

    // 8. Sync initial recent media from graph.instagram.com/me/media
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

    if (isPopupFlow) {
      return popupResponse({
        success: true,
        username: resolvedUsername,
        platform: "instagram",
      });
    }

    const returnPath = validation.returnTo || "/dashboard/accounts";
    const destinationUrl = new URL(returnPath, appUrl);
    destinationUrl.searchParams.set("success", "connected");
    destinationUrl.searchParams.set("platform", "instagram");
    destinationUrl.searchParams.set("username", resolvedUsername);

    const redirectResponse = redirectWithClearedCookie(destinationUrl.toString());

    // Synchronize user session cookie if needed
    const activeUserId = session?.user?.id || validation.userId;
    if (activeUserId) {
      try {
        const freshAccessToken = await createAccessToken({
          userId: activeUserId,
          sessionId: session?.sessionId || `ses_${Date.now()}`,
          orgId: organizationId,
          role: session?.role || "owner",
          isSuperAdmin: Boolean(session?.isSuperAdmin),
        });
        setAuthCookies(redirectResponse, { accessToken: freshAccessToken });
      } catch (tokenErr) {
        console.warn("[InstagramCallback] Session token sync note:", tokenErr.message);
      }
    }

    return redirectResponse;
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
