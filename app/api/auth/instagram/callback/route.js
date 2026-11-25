import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createAccessToken } from "@/lib/auth/tokens";
import { setAuthCookies } from "@/lib/auth/cookies";
import { getInstagramRedirectUri } from "@/lib/meta/constants";
import {
  validateAndConsumeOAuthState,
  STATE_COOKIE_NAME,
} from "@/lib/meta/oauth-state";
import {
  exchangeInstagramDirectCode,
  exchangeInstagramDirectLongLivedToken,
  fetchInstagramDirectProfile,
  fetchInstagramDirectMedia,
  subscribeInstagramDirectWebhooks,
} from "@/lib/meta/instagram-direct";
import { accountStore } from "@/lib/storage/account-store";
import { db } from "@/lib/db/client";

/**
 * GET /api/auth/instagram/callback
 * Handles Meta's "Instagram API with Instagram Login" OAuth callback:
 * 1. Validates and consumes single-use signed state.
 * 2. Exchanges authorization code for long-lived credentials.
 * 3. Retrieves Instagram Business/Creator profile details.
 * 4. Saves account into Neon PostgreSQL instagram_accounts with AES-256-GCM encryption.
 * 5. Automatically syncs published posts & Reels into instagram_media.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
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

  // 1. Handle user cancellation or denial
  if (errorParam || errorReason) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "InstagramDirectCallback",
        action: "oauth_denied_by_user",
        error: errorParam,
        reason: errorReason,
        description: errorDescription,
        timestamp: new Date().toISOString(),
      })
    );
    accountsRedirectUrl.searchParams.set("error", "oauth_denied");
    accountsRedirectUrl.searchParams.set(
      "message",
      errorDescription || "Instagram authorization was cancelled."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 2. Resolve current session (if available)
  const session = await getCurrentSession(req);

  // 3. Read HttpOnly state cookie
  const cookieValue = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;

  // 4. Validate and consume OAuth state
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
    accountsRedirectUrl.searchParams.set("error", validation.code || "invalid_state");
    accountsRedirectUrl.searchParams.set(
      "message",
      validation.error || "OAuth state verification failed. Please try connecting again."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 5. Ensure code is present
  if (!code) {
    accountsRedirectUrl.searchParams.set("error", "missing_code");
    accountsRedirectUrl.searchParams.set(
      "message",
      "Missing authorization code from Instagram callback."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  const { organizationId } = validation;
  const redirectUri = getInstagramRedirectUri(req);

  try {
    console.log(
      JSON.stringify({
        level: "info",
        service: "InstagramDirectCallback",
        action: "exchanging_direct_code_for_token",
        organizationId,
        redirectUri,
        timestamp: new Date().toISOString(),
      })
    );

    // 6. Exchange code for short-lived token
    const tokenResult = await exchangeInstagramDirectCode({
      code,
      redirectUri,
    });

    // 7. Exchange for 60-day long-lived token
    const longLived = await exchangeInstagramDirectLongLivedToken({
      shortLivedToken: tokenResult.accessToken,
    });

    const accessToken = longLived.accessToken;
    const tokenExpiresAt = new Date(
      Date.now() + (longLived.expiresIn || 60 * 24 * 60 * 60) * 1000
    ).toISOString();

    // 8. Fetch Instagram profile
    const profile = await fetchInstagramDirectProfile({ accessToken });

    // 9. Check 4-account limit for customer organization
    const isPlatform = organizationId === "org_platform_super_admin";
    if (!isPlatform) {
      const existingAccounts = await accountStore.listAccounts(organizationId);
      const isAlreadyConnected = existingAccounts.some(
        (a) => a.id === profile.id || a.instagramBusinessId === profile.id
      );
      if (!isAlreadyConnected && existingAccounts.length >= 4) {
        accountsRedirectUrl.searchParams.set("error", "account_limit_reached");
        accountsRedirectUrl.searchParams.set(
          "message",
          "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first."
        );
        return redirectWithClearedCookie(accountsRedirectUrl.toString());
      }
    }

    // 10. Subscribe webhooks (direct)
    try {
      await subscribeInstagramDirectWebhooks({
        accessToken,
        userId: profile.id,
      });
    } catch (whErr) {
      console.warn("[InstagramDirectCallback] Webhook subscription note:", whErr.message);
    }

    // 11. Durably save into AccountStore with AES-256-GCM encrypted tokens
    await accountStore.saveAccount({
      organizationId,
      platform: "instagram",
      id: profile.id,
      instagramBusinessId: profile.id,
      username: profile.username,
      name: profile.name,
      profilePictureUrl: profile.profilePictureUrl,
      accountType: profile.accountType || "BUSINESS",
      pageId: null,
      pageName: null,
      accessToken,
      pageToken: accessToken, // Direct Instagram tokens serve for all Instagram Graph API actions
      tokenExpiresAt,
    });

    console.log(
      JSON.stringify({
        level: "info",
        service: "InstagramDirectCallback",
        action: "direct_account_connected_successfully",
        organizationId,
        instagramBusinessId: profile.id,
        username: profile.username,
      })
    );

    // 12. Automatically sync initial media into instagram_media table
    try {
      const mediaResult = await fetchInstagramDirectMedia({
        accessToken,
        limit: 25,
      });
      if (mediaResult?.data?.length > 0) {
        await db.saveInstagramMedia(
          mediaResult.data,
          organizationId,
          profile.id,
          "instagram"
        );
        console.log(
          `[InstagramDirectCallback] Synced ${mediaResult.data.length} posts for @${profile.username}`
        );
      }
    } catch (mediaErr) {
      console.warn(
        `[InstagramDirectCallback] Initial media sync note for @${profile.username}:`,
        mediaErr.message
      );
    }

    const returnPath =
      validation.returnTo || (isPlatform ? "/admin/integrations" : "/dashboard/accounts");
    const destinationUrl = new URL(returnPath, appUrl);
    destinationUrl.searchParams.set("success", "connected");
    destinationUrl.searchParams.set("platform", "instagram");
    destinationUrl.searchParams.set("username", profile.username);

    const redirectResponse = redirectWithClearedCookie(destinationUrl.toString());

    // 13. Synchronize user session cookie so active organization stays in sync
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
        console.warn("[InstagramDirectCallback] Session token sync note:", tokenErr.message);
      }
    }

    return redirectResponse;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "InstagramDirectCallback",
        action: "oauth_flow_exception",
        error: err.message,
        status: err.status,
        code: err.code,
      })
    );

    accountsRedirectUrl.searchParams.set("error", "connection_failed");
    accountsRedirectUrl.searchParams.set(
      "message",
      err.message || "Failed to complete direct Instagram connection."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }
}
