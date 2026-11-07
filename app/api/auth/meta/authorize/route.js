import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { generateOAuthState } from "@/lib/crypto/encryption";
import {
  META_OAUTH_DIALOG_URL,
  REQUIRED_META_SCOPES,
  getMetaRedirectUri,
} from "@/lib/meta/constants";

/**
 * GET /api/auth/meta/authorize
 * Initiates the Meta OAuth flow for the active authenticated organization.
 */
export async function GET(req) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsUrl = new URL("/dashboard/accounts", appUrl);

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  // 1. Verify Meta environment configuration
  if (!appId || !appSecret) {
    const missingKeys = [
      !appId && "META_APP_ID",
      !appSecret && "META_APP_SECRET",
    ].filter(Boolean);

    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaOAuthAuthorize",
        action: "missing_configuration",
        missing: missingKeys,
        timestamp: new Date().toISOString(),
      })
    );

    accountsUrl.searchParams.set("error", "missing_configuration");
    accountsUrl.searchParams.set(
      "message",
      `Meta API credentials are not configured (${missingKeys.join(", ")} missing). Please configure .env.local to connect your Instagram account.`
    );
    return NextResponse.redirect(accountsUrl.toString());
  }

  // 2. Resolve authenticated user & active organization
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthAuthorize",
        action: "unauthenticated_attempt",
        timestamp: new Date().toISOString(),
      })
    );
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("redirect", "/dashboard/accounts");
    return NextResponse.redirect(loginUrl.toString());
  }

  if (!hasPermission(session.role, PERMISSIONS.CONNECT_INSTAGRAM)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthAuthorize",
        action: "permission_denied",
        role: session.role,
        organizationId: session.organizationId,
        timestamp: new Date().toISOString(),
      })
    );
    accountsUrl.searchParams.set("error", "forbidden");
    accountsUrl.searchParams.set(
      "message",
      "You do not have permission to connect Instagram accounts for this organization."
    );
    return NextResponse.redirect(accountsUrl.toString());
  }

  const organizationId = session.organizationId;
  const userId = session.user.id;

  // 3. Generate cryptographically signed state token with HMAC-SHA256
  const state = generateOAuthState({ organizationId, userId });

  // 4. Resolve normalized callback URL
  const redirectUri = getMetaRedirectUri(req);

  // 5. Safe structured logging (no secrets or sensitive tokens)
  console.log(
    JSON.stringify({
      level: "info",
      service: "MetaOAuthAuthorize",
      action: "oauth_flow_initiated",
      organizationId,
      userId,
      redirectUri,
      scopeCount: REQUIRED_META_SCOPES.length,
      timestamp: new Date().toISOString(),
    })
  );

  // 6. Build Meta authorization URL
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: REQUIRED_META_SCOPES.join(","),
    response_type: "code",
  });

  const authorizationUrl = `${META_OAUTH_DIALOG_URL}?${params.toString()}`;

  return NextResponse.redirect(authorizationUrl);
}


