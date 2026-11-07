import { NextResponse } from "next/server";
import { validateOAuthState } from "@/lib/crypto/encryption";
import { getMetaRedirectUri } from "@/lib/meta/constants";
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchPagesWithInstagramAccounts,
  subscribePageToWebhooks,
} from "@/lib/meta/client";
import { accountStore } from "@/lib/storage/account-store";

/**
 * GET /api/auth/meta/callback
 * Receives the authorization code from Meta, exchanges for long-lived credentials,
 * subscribes page webhooks, and associates the Instagram account with the organization.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsRedirectUrl = new URL("/dashboard/accounts", appUrl);

  // 1. Handle user cancellation or Meta denial
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
    return NextResponse.redirect(accountsRedirectUrl.toString());
  }

  // 2. Validate cryptographic state
  if (!state || !code) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthCallback",
        action: "missing_callback_parameters",
        hasState: Boolean(state),
        hasCode: Boolean(code),
        timestamp: new Date().toISOString(),
      })
    );
    accountsRedirectUrl.searchParams.set("error", "missing_parameters");
    accountsRedirectUrl.searchParams.set(
      "message",
      "Missing authorization code or state token from Meta callback."
    );
    return NextResponse.redirect(accountsRedirectUrl.toString());
  }

  const stateValidation = validateOAuthState(state);
  if (!stateValidation.valid) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaOAuthCallback",
        action: "state_validation_failed",
        error: stateValidation.error,
        timestamp: new Date().toISOString(),
      })
    );
    accountsRedirectUrl.searchParams.set("error", "invalid_state");
    accountsRedirectUrl.searchParams.set(
      "message",
      "OAuth state verification failed. Please try connecting again."
    );
    return NextResponse.redirect(accountsRedirectUrl.toString());
  }

  const { organizationId } = stateValidation;
  const redirectUri = getMetaRedirectUri(req);

  try {
    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaOAuthCallback",
        action: "exchanging_code_for_token",
        organizationId,
        redirectUri,
        timestamp: new Date().toISOString(),
      })
    );

    // 3. Exchange authorization code for short-lived token
    const tokenResponse = await exchangeCodeForUserToken({
      code,
      redirectUri,
    });
    const shortLivedToken = tokenResponse.access_token;

    // 4. Exchange for 60-day long-lived User token
    const longLivedResponse = await exchangeForLongLivedToken(shortLivedToken);
    const longLivedUserToken = longLivedResponse.access_token;
    const expiresInSeconds = longLivedResponse.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 5. Fetch managed Facebook Pages with linked Instagram Business accounts
    const pagesWithInstagram = await fetchPagesWithInstagramAccounts(longLivedUserToken);

    if (pagesWithInstagram.length === 0) {
      accountsRedirectUrl.searchParams.set("error", "no_instagram_business_account");
      accountsRedirectUrl.searchParams.set(
        "message",
        "No Instagram Professional (Business or Creator) account was found connected to your Facebook Pages. Please link your Instagram account to a Facebook Page in Meta settings and retry."
      );
      return NextResponse.redirect(accountsRedirectUrl.toString());
    }

    // 6. Connect the first discovered Instagram Professional account (or all)
    const primaryTarget = pagesWithInstagram[0];

    // 7. Subscribe the Facebook Page's feed & messages webhooks
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
      // We continue even if auto-subscription encounters permission check, to allow account saving
    }

    // 8. Durably save the account in AccountStore with encrypted tokens
    await accountStore.saveAccount({
      organizationId,
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

    accountsRedirectUrl.searchParams.set("success", "connected");
    accountsRedirectUrl.searchParams.set("username", primaryTarget.instagram.username);
    return NextResponse.redirect(accountsRedirectUrl.toString());
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
    return NextResponse.redirect(accountsRedirectUrl.toString());
  }
}

