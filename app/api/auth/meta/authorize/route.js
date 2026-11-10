import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ROLES, MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER } from "@/lib/constants";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import {
  generateSecureOAuthState,
  buildMetaUnifiedLoginUrl,
} from "@/lib/meta/oauth-state";
import {
  META_DEFAULT_APP_ID,
  META_DEFAULT_CONFIG_ID,
  META_DEFAULT_APP_SECRET,
  getMetaRedirectUri,
} from "@/lib/meta/constants";

/**
 * GET /api/auth/meta/authorize
 * Initiates the Meta Instagram API with Unified Login flow for the active authenticated organization.
 */
export async function GET(req) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsUrl = new URL("/dashboard/accounts", appUrl);

  const appId = process.env.META_APP_ID || META_DEFAULT_APP_ID;
  const configId =
    process.env.META_CONFIG_ID !== undefined
      ? process.env.META_CONFIG_ID
      : META_DEFAULT_CONFIG_ID;
  const appSecret = process.env.META_APP_SECRET || META_DEFAULT_APP_SECRET;

  // 1. Verify Meta environment configuration
  if (!appId) {
    accountsUrl.searchParams.set("error", "missing_configuration");
    accountsUrl.searchParams.set(
      "message",
      "Meta API credentials are not configured. Please configure .env.local to connect your Instagram account."
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

  const role = session.role || "owner";
  const isAuthorized =
    session.isSuperAdmin ||
    role === ROLES.OWNER ||
    role === ROLES.ADMIN ||
    role === "customer" ||
    session.user?.platformRole === "customer" ||
    hasPermission(role, PERMISSIONS.CONNECT_INSTAGRAM);

  if (!isAuthorized) {
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

  const isPlatformScope = req.nextUrl.searchParams.get("scope") === "platform";
  const platform = req.nextUrl.searchParams.get("platform") === "facebook" ? "facebook" : "instagram";

  let organizationId = session.organizationId;
  const userId = session.user.id;

  if (isPlatformScope && session.isSuperAdmin) {
    organizationId = "org_platform_super_admin";
  } else {
    if (!organizationId) {
      const userOrgs = await db.listUserOrganizations(userId);
      if (userOrgs && userOrgs.length > 0) {
        organizationId = userOrgs[0].id;
      } else {
        const orgId = `org_${Date.now()}`;
        await db.createOrganization({
          id: orgId,
          name: `${session.user.name || "Default"}'s Workspace`,
          slug: `workspace-${Date.now()}`,
        });
        await db.addOrganizationMember({
          id: `mem_${Date.now()}`,
          organizationId: orgId,
          userId,
          role: ROLES.OWNER,
        });
        organizationId = orgId;
      }
    }

    // Enforce 4 connected accounts limit per customer workspace
    const limitStatus = await accountStore.getAccountLimitStatus(organizationId);
    if (limitStatus.isLimitReached) {
      accountsUrl.searchParams.set("error", "limit_reached");
      accountsUrl.searchParams.set(
        "message",
        `Maximum limit of ${MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER} connected accounts reached. Please disconnect an existing account first.`
      );
      return NextResponse.redirect(accountsUrl.toString());
    }
  }

  const redirectUri = getMetaRedirectUri(req);

  // 3. Generate cryptographically secure random state (Node.js crypto.randomBytes(32), base64url)
  // and associated signed, tamper-proof HttpOnly cookie
  const { state, cookieName, cookieValue, cookieOptions } =
    generateSecureOAuthState({
      organizationId,
      userId,
      redirectUri,
      platform,
    });

  // 4. Safe structured logging (no secrets, authorization codes or tokens)
  console.log(
    JSON.stringify({
      level: "info",
      service: "MetaOAuthAuthorize",
      action: "unified_login_flow_initiated",
      organizationId,
      userId,
      platform,
      redirectUri,
      configId,
      timestamp: new Date().toISOString(),
    })
  );

  // 5. Construct Meta Unified Login authorization URL dynamically with URLSearchParams
  const authorizationUrl = buildMetaUnifiedLoginUrl({
    state,
    req,
    clientId: appId,
    configId,
    redirectUri,
    platform,
  });

  // 6. Set HTTP-only, SameSite=lax cookie on redirect response
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(cookieName, cookieValue, cookieOptions);
  return response;
}
