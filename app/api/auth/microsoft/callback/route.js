import { NextResponse } from "next/server";
import { validateOAuthState } from "@/lib/crypto/encryption";
import {
  getMicrosoftRedirectUri,
  exchangeCodeForMicrosoftTokens,
  fetchMicrosoftUserProfile,
} from "@/lib/integrations/microsoft";
import { integrationStore } from "@/lib/storage/integration-store";

/**
 * GET /api/auth/microsoft/callback
 * Receives authorization code from Microsoft, exchanges for tokens, and stores encrypted credentials.
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
  const integrationsRedirectUrl = new URL("/dashboard/integrations", appUrl);

  // 1. Handle user cancellation or Microsoft denial
  if (errorParam) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MicrosoftOAuthCallback",
        action: "oauth_denied",
        error: errorParam,
        description: errorDescription,
        timestamp: new Date().toISOString(),
      })
    );
    integrationsRedirectUrl.searchParams.set("error", "oauth_denied");
    integrationsRedirectUrl.searchParams.set(
      "message",
      errorDescription || "Microsoft Excel authorization was cancelled or denied."
    );
    return NextResponse.redirect(integrationsRedirectUrl.toString());
  }

  // 2. Validate cryptographic state
  if (!state || !code) {
    integrationsRedirectUrl.searchParams.set("error", "missing_parameters");
    integrationsRedirectUrl.searchParams.set(
      "message",
      "Missing authorization code or state token from Microsoft callback."
    );
    return NextResponse.redirect(integrationsRedirectUrl.toString());
  }

  const stateValidation = validateOAuthState(state);
  if (!stateValidation.valid) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MicrosoftOAuthCallback",
        action: "state_validation_failed",
        error: stateValidation.error,
        timestamp: new Date().toISOString(),
      })
    );
    integrationsRedirectUrl.searchParams.set("error", "invalid_state");
    integrationsRedirectUrl.searchParams.set(
      "message",
      "OAuth state verification failed. Please try connecting again."
    );
    return NextResponse.redirect(integrationsRedirectUrl.toString());
  }

  const { organizationId } = stateValidation;
  const redirectUri = getMicrosoftRedirectUri(req);

  try {
    // 3. Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForMicrosoftTokens({
      code,
      redirectUri,
    });

    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token;
    const expiresIn = tokenResponse.expires_in || 3600;

    // 4. Retrieve user profile from Microsoft Graph
    const profile = await fetchMicrosoftUserProfile(accessToken);

    // 5. Durably save integration with AES-256-GCM encrypted tokens
    await integrationStore.saveIntegration(organizationId, {
      microsoftUserId: profile.id,
      accountEmail: profile.email,
      displayName: profile.displayName,
      accessToken,
      refreshToken,
      expiresIn,
      scopes: (tokenResponse.scope || "").split(" "),
    });

    console.log(
      JSON.stringify({
        level: "info",
        service: "MicrosoftOAuthCallback",
        action: "connected_successfully",
        organizationId,
        email: profile.email,
        timestamp: new Date().toISOString(),
      })
    );

    integrationsRedirectUrl.searchParams.set("success", "connected");
    integrationsRedirectUrl.searchParams.set("account", profile.email);
    return NextResponse.redirect(integrationsRedirectUrl.toString());
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MicrosoftOAuthCallback",
        action: "exchange_exception",
        error: err.message,
        timestamp: new Date().toISOString(),
      })
    );

    integrationsRedirectUrl.searchParams.set("error", "connection_failed");
    integrationsRedirectUrl.searchParams.set(
      "message",
      err.message || "Failed to complete Microsoft Excel connection."
    );
    return NextResponse.redirect(integrationsRedirectUrl.toString());
  }
}

