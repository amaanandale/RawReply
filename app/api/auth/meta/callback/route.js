import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getMetaRedirectUri } from "@/lib/meta/constants";
import {
  validateAndConsumeOAuthState,
  STATE_COOKIE_NAME,
} from "@/lib/meta/oauth-state";
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchPagesWithInstagramAccounts,
  fetchUserFacebookPages,
  subscribePageToWebhooks,
} from "@/lib/meta/client";
import { accountStore } from "@/lib/storage/account-store";
import { logSystemError, ERROR_CATEGORIES, ERROR_SEVERITIES } from "@/lib/monitoring/error-logger";

/**
 * GET /api/auth/meta/callback
 * Handles the Meta Instagram API with Unified Login callback:
 * 1. Safely checks for Meta authorization denials/errors.
 * 2. Strictly validates the OAuth state and HttpOnly cookie BEFORE token exchange.
 * 3. Enforces single-use state consumption to prevent replay attacks.
 * 4. Preserves organization-level account isolation.
 * 5. Exchanges the authorization code for long-lived credentials and saves the account with AES-256-GCM encryption.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsRedirectUrl = new URL("/dashboard/accounts", appUrl);

  // Helper to clear the state cookie on any terminal redirect response
  function redirectWithClearedCookie(url) {
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE_NAME);
    return res;
  }

  // 1. Handle user cancellation or Meta authorization denial safely
  if (errorParam) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthCallback",
        action: "oauth_denied_by_user_or_meta",
        error: errorParam,
        description: errorDescription,
        timestamp: new Date().toISOString(),
      })
    );
    accountsRedirectUrl.searchParams.set("error", "oauth_denied");
    accountsRedirectUrl.searchParams.set(
      "message",
      errorDescription || "Instagram authorization was cancelled or denied by Meta."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 2. Resolve current session (if available) for organization authorization verification
  const session = await getCurrentSession(req);

  // 3. Read the HttpOnly state cookie
  const cookieValue = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;

  // 4. Validate and consume OAuth state BEFORE exchanging the authorization code
  // Rejects missing, expired, mismatched, tampered, or previously used states.
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
        service: "MetaOAuthCallback",
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

  // 5. Ensure authorization code is present
  if (!code) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthCallback",
        action: "missing_authorization_code",
        timestamp: new Date().toISOString(),
      })
    );
    accountsRedirectUrl.searchParams.set("error", "missing_code");
    accountsRedirectUrl.searchParams.set(
      "message",
      "Missing authorization code from Meta callback."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  const { organizationId, platform = "instagram" } = validation;
  const redirectUri = getMetaRedirectUri(req);

  try {
    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaOAuthCallback",
        action: "exchanging_code_for_token",
        organizationId,
        platform,
        redirectUri,
        timestamp: new Date().toISOString(),
      })
    );

    // 6. Exchange authorization code for short-lived token
    const tokenResponse = await exchangeCodeForUserToken({
      code,
      redirectUri,
    });
    const shortLivedToken = tokenResponse.access_token;

    // 7. Exchange for 60-day long-lived User token
    const longLivedResponse = await exchangeForLongLivedToken(shortLivedToken);
    const longLivedUserToken = longLivedResponse.access_token;
    const expiresInSeconds = longLivedResponse.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const isPlatform = organizationId === "org_platform_super_admin";

    // ─────────────────────────────────────────────────────────────
    // BRANCH A: FACEBOOK PAGE CONNECTION FLOW
    // ─────────────────────────────────────────────────────────────
    if (platform === "facebook") {
      const facebookPages = await fetchUserFacebookPages(longLivedUserToken);

      if (!facebookPages || facebookPages.length === 0) {
        accountsRedirectUrl.searchParams.set("error", "no_facebook_pages");
        accountsRedirectUrl.searchParams.set(
          "message",
          "No Facebook Pages were found for your account. Please ensure you are an Administrator of at least one Facebook Page."
        );
        return redirectWithClearedCookie(accountsRedirectUrl.toString());
      }

      // Enforce 4-account limit for customer workspaces before saving
      if (!isPlatform) {
        const existingAccounts = await accountStore.listAccounts(organizationId);
        const isAlreadyConnected = existingAccounts.some(
          (a) => a.id === facebookPages[0].pageId || a.pageId === facebookPages[0].pageId
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

      const primaryPage = facebookPages[0];

      // Subscribe the Facebook Page's feed & messages webhooks
      try {
        await subscribePageToWebhooks({
          pageId: primaryPage.pageId,
          pageAccessToken: primaryPage.pageToken,
        });
      } catch (webhookErr) {
        console.warn(
          JSON.stringify({
            level: "warn",
            service: "MetaOAuthCallback",
            action: "facebook_webhook_subscription_warning",
            pageId: primaryPage.pageId,
            error: webhookErr.message,
          })
        );
      }

      // Save Facebook Page in AccountStore
      await accountStore.saveAccount({
        organizationId,
        platform: "facebook",
        instagramBusinessId: primaryPage.pageId,
        pageId: primaryPage.pageId,
        pageName: primaryPage.pageName,
        username: primaryPage.pageName,
        name: primaryPage.pageName,
        profilePictureUrl: primaryPage.profilePictureUrl,
        accountType: "PAGE",
        accessToken: longLivedUserToken,
        pageToken: primaryPage.pageToken,
        tokenExpiresAt,
      });

      console.log(
        JSON.stringify({
          level: "info",
          service: "MetaOAuthCallback",
          action: "facebook_page_connected_successfully",
          organizationId,
          pageId: primaryPage.pageId,
          pageName: primaryPage.pageName,
        })
      );

      const destinationUrl = isPlatform
        ? new URL("/admin/integrations", appUrl)
        : accountsRedirectUrl;

      destinationUrl.searchParams.set("success", "connected");
      destinationUrl.searchParams.set("platform", "facebook");
      destinationUrl.searchParams.set("username", primaryPage.pageName);
      return redirectWithClearedCookie(destinationUrl.toString());
    }

    // ─────────────────────────────────────────────────────────────
    // BRANCH B: INSTAGRAM PROFESSIONAL ACCOUNT CONNECTION FLOW
    // ─────────────────────────────────────────────────────────────
    const pagesWithInstagram = await fetchPagesWithInstagramAccounts(longLivedUserToken);

    if (pagesWithInstagram.length === 0) {
      accountsRedirectUrl.searchParams.set("error", "no_instagram_business_account");
      accountsRedirectUrl.searchParams.set(
        "message",
        "No Instagram Professional (Business or Creator) account was found connected to your Facebook Pages. Please link your Instagram account to a Facebook Page in Meta settings and retry."
      );
      return redirectWithClearedCookie(accountsRedirectUrl.toString());
    }

    // Connect the primary Instagram Professional account
    const primaryTarget = pagesWithInstagram[0];

    // Subscribe the Facebook Page's feed & messages webhooks
    try {
      await subscribePageToWebhooks({
        pageId: primaryTarget.pageId,
        pageAccessToken: primaryTarget.pageToken,
      });
    } catch (webhookErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "MetaOAuthCallback",
          action: "webhook_subscription_warning",
          pageId: primaryTarget.pageId,
          error: webhookErr.message,
        })
      );
    }

    // Enforce 4-account limit for customer workspaces before saving
    if (!isPlatform) {
      const existingAccounts = await accountStore.listAccounts(organizationId);
      const isAlreadyConnected = existingAccounts.some(
        (a) => a.instagramBusinessId === primaryTarget.instagram.id || a.id === primaryTarget.instagram.id
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

    // Durably save the account in AccountStore with AES-256-GCM encrypted tokens
    await accountStore.saveAccount({
      organizationId,
      platform: "instagram",
      instagramBusinessId: primaryTarget.instagram.id,
      username: primaryTarget.instagram.username,
      name: primaryTarget.instagram.name,
      profilePictureUrl: primaryTarget.instagram.profilePictureUrl,
      accountType: primaryTarget.instagram.accountType,
      pageId: primaryTarget.pageId,
      pageName: primaryTarget.pageName,
      accessToken: longLivedUserToken,
      pageToken: primaryTarget.pageToken,
      tokenExpiresAt,
    });

    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaOAuthCallback",
        action: "account_connected_successfully",
        organizationId,
        instagramBusinessId: primaryTarget.instagram.id,
        username: primaryTarget.instagram.username,
      })
    );

    const destinationUrl = isPlatform
      ? new URL("/admin/integrations", appUrl)
      : accountsRedirectUrl;

    destinationUrl.searchParams.set("success", "connected");
    destinationUrl.searchParams.set("platform", "instagram");
    destinationUrl.searchParams.set("username", primaryTarget.instagram.username);
    return redirectWithClearedCookie(destinationUrl.toString());
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaOAuthCallback",
        action: "oauth_flow_exception",
        error: err.message,
        status: err.status,
        code: err.code,
      })
    );

    accountsRedirectUrl.searchParams.set("error", "connection_failed");
    accountsRedirectUrl.searchParams.set(
      "message",
      err.message || "Failed to complete Instagram account connection."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }
}
