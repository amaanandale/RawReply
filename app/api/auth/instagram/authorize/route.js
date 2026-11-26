import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ROLES, MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER } from "@/lib/constants";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import {
  generateSecureOAuthState,
  buildInstagramDirectLoginUrl,
} from "@/lib/meta/oauth-state";
import { getInstagramRedirectUri } from "@/lib/meta/constants";

/**
 * GET /api/auth/instagram/authorize
 * Initiates Instagram connection.
 *
 * 1. If a dedicated INSTAGRAM_APP_ID is configured (from Meta Developers > Instagram > API setup with Instagram login),
 *    initiates direct Instagram OAuth (https://api.instagram.com/oauth/authorize) displaying the pure Instagram login page.
 * 2. If INSTAGRAM_APP_ID is not configured, transparently forwards to Meta Unified Login (/api/auth/meta/authorize?platform=instagram)
 *    to prevent Meta's "Invalid Request: Request parameters are invalid: Invalid platform app" error.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const searchParams = new URLSearchParams(url.searchParams);
  const isPopup = searchParams.get("popup") === "1";
  const returnTo = searchParams.get("returnTo") || "/dashboard/accounts";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;

  const instagramAppId = process.env.INSTAGRAM_APP_ID;

  // Direct Instagram Login flow (when a dedicated Instagram App ID is registered in Meta)
  if (instagramAppId && instagramAppId !== process.env.META_APP_ID) {
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
      const accountsUrl = new URL("/dashboard/accounts", appUrl);
      accountsUrl.searchParams.set("error", "forbidden");
      accountsUrl.searchParams.set("message", "Permission denied.");
      return NextResponse.redirect(accountsUrl.toString());
    }

    let organizationId = session.organizationId;
    const userId = session.user.id;
    if (!organizationId) {
      const userOrgs = await db.listUserOrganizations(userId);
      organizationId = userOrgs?.[0]?.id || `org_${Date.now()}`;
    }

    const limitStatus = await accountStore.getAccountLimitStatus(organizationId);
    if (limitStatus.isLimitReached) {
      const accountsUrl = new URL("/dashboard/accounts", appUrl);
      accountsUrl.searchParams.set("error", "limit_reached");
      accountsUrl.searchParams.set(
        "message",
        `Maximum limit of ${MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER} connected accounts reached. Please disconnect an existing account first.`
      );
      return NextResponse.redirect(accountsUrl.toString());
    }

    const redirectUri = getInstagramRedirectUri(req);
    const { state, cookieName, cookieValue, cookieOptions } =
      generateSecureOAuthState({
        organizationId,
        userId,
        redirectUri,
        platform: "instagram",
        returnTo,
        popup: isPopup,
      });

    const directUrl = buildInstagramDirectLoginUrl({
      state,
      req,
      clientId: instagramAppId,
      redirectUri,
    });

    if (directUrl) {
      const response = NextResponse.redirect(directUrl);
      response.cookies.set(cookieName, cookieValue, cookieOptions);
      return response;
    }
  }

  // Fallback: Meta Unified Login flow
  if (!searchParams.has("platform")) {
    searchParams.set("platform", "instagram");
  }
  const targetUrl = new URL("/api/auth/meta/authorize", appUrl);
  targetUrl.search = searchParams.toString();
  return NextResponse.redirect(targetUrl.toString());
}
