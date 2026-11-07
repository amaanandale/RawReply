import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { generateOAuthState } from "@/lib/crypto/encryption";
import {
  MICROSOFT_AUTH_BASE_URL,
  REQUIRED_MICROSOFT_SCOPES,
  getMicrosoftRedirectUri,
  isMicrosoftConfigured,
} from "@/lib/integrations/microsoft";

/**
 * GET /api/auth/microsoft/authorize
 * Initiates Microsoft OAuth 2.0 flow for OneDrive / Excel access.
 */
export async function GET(req) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const integrationsUrl = new URL("/dashboard/integrations", appUrl);

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  // 1. Verify Microsoft environment configuration
  if (!clientId || !clientSecret) {
    const missingKeys = [
      !clientId && "MICROSOFT_CLIENT_ID",
      !clientSecret && "MICROSOFT_CLIENT_SECRET",
    ].filter(Boolean);

    console.error(
      JSON.stringify({
        level: "error",
        service: "MicrosoftOAuthAuthorize",
        action: "missing_configuration",
        missing: missingKeys,
        timestamp: new Date().toISOString(),
      })
    );

    integrationsUrl.searchParams.set("error", "missing_configuration");
    integrationsUrl.searchParams.set(
      "message",
      `Microsoft credentials not configured (${missingKeys.join(", ")} missing). Please configure .env.local to enable Excel integration.`
    );
    return NextResponse.redirect(integrationsUrl.toString());
  }

  // 2. Resolve authenticated user & active organization
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("redirect", "/dashboard/integrations");
    return NextResponse.redirect(loginUrl.toString());
  }

  if (!hasPermission(session.role, PERMISSIONS.MANAGE_INTEGRATIONS)) {
    integrationsUrl.searchParams.set("error", "forbidden");
    integrationsUrl.searchParams.set(
      "message",
      "You do not have permission to manage integrations for this organization."
    );
    return NextResponse.redirect(integrationsUrl.toString());
  }

  const organizationId = session.organizationId;
  const userId = session.user.id;

  // 3. Generate HMAC-signed state token
  const state = generateOAuthState({ organizationId, userId });

  // 4. Resolve normalized callback URL
  const redirectUri = getMicrosoftRedirectUri(req);

  console.log(
    JSON.stringify({
      level: "info",
      service: "MicrosoftOAuthAuthorize",
      action: "oauth_flow_initiated",
      organizationId,
      userId,
      redirectUri,
      timestamp: new Date().toISOString(),
    })
  );

  // 5. Build Microsoft authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: REQUIRED_MICROSOFT_SCOPES.join(" "),
    state,
    prompt: "consent", // Ensure refresh token is issued
  });

  const authorizationUrl = `${MICROSOFT_AUTH_BASE_URL}/authorize?${params.toString()}`;

  return NextResponse.redirect(authorizationUrl);
}

