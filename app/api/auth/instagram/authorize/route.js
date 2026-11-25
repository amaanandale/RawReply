import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ROLES, MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER } from "@/lib/constants";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import { generateSecureOAuthState } from "@/lib/meta/oauth-state";
import {
  buildInstagramDirectAuthorizeUrl,
  getInstagramDirectCredentials,
} from "@/lib/meta/instagram-direct";
import { getInstagramRedirectUri } from "@/lib/meta/constants";

/**
 * GET /api/auth/instagram/authorize
 * Initiates direct Instagram Business/Creator login via Meta's Instagram API with Instagram Login.
 * No Facebook Page or Meta Business Portfolio linkage required.
 */
export async function GET(req) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsUrl = new URL("/dashboard/accounts", appUrl);

  const { appId } = getInstagramDirectCredentials();

  // 1. Verify credentials configuration
  if (!appId) {
    accountsUrl.searchParams.set("error", "missing_configuration");
    accountsUrl.searchParams.set(
      "message",
      "Instagram App ID is not configured. Please set INSTAGRAM_APP_ID or META_APP_ID in environment settings."
    );
    return NextResponse.redirect(accountsUrl.toString());
  }

  // 2. Resolve authenticated user & active organization
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
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
    accountsUrl.searchParams.set("error", "forbidden");
    accountsUrl.searchParams.set(
      "message",
      "You do not have permission to connect Instagram accounts for this organization."
    );
    return NextResponse.redirect(accountsUrl.toString());
  }

  const returnTo =
    req.nextUrl.searchParams.get("returnTo") ||
    (req.nextUrl.searchParams.get("from") === "accounts" ? "/dashboard/accounts" : "/dashboard");

  let organizationId = session.organizationId;
  const userId = session.user.id;

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

  // 3. Enforce 4 connected accounts limit per customer workspace
  const limitStatus = await accountStore.getAccountLimitStatus(organizationId);
  if (limitStatus.isLimitReached) {
    accountsUrl.searchParams.set("error", "limit_reached");
    accountsUrl.searchParams.set(
      "message",
      `Maximum limit of ${MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER} connected accounts reached. Please disconnect an existing account first.`
    );
    return NextResponse.redirect(accountsUrl.toString());
  }

  const redirectUri = getInstagramRedirectUri(req);

  // 4. Generate cryptographically secure random state & signed cookie
  const { state, cookieName, cookieValue, cookieOptions } = generateSecureOAuthState({
    organizationId,
    userId,
    redirectUri,
    platform: "instagram_direct",
    returnTo,
  });

  console.log(
    JSON.stringify({
      level: "info",
      service: "InstagramDirectAuthorize",
      action: "direct_instagram_login_initiated",
      organizationId,
      userId,
      redirectUri,
      timestamp: new Date().toISOString(),
    })
  );

  // 5. Build Instagram Direct authorization URL
  const authorizationUrl = buildInstagramDirectAuthorizeUrl({
    state,
    req,
    clientId: appId,
    redirectUri,
  });

  // 6. Set HTTP-only, SameSite=lax cookie on redirect response
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(cookieName, cookieValue, cookieOptions);
  return response;
}
