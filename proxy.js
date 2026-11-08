import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_ISSUER = process.env.JWT_ISSUER || "rawreply";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "rawreply-api";

function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret) {
    return new TextEncoder().encode("rawreply_jwt_default_secret_key_32_bytes_len!!");
  }
  return new TextEncoder().encode(secret);
}

export default async function middleware(req) {
  const pathname = req.nextUrl.pathname;
  const isRootRoute = pathname === "/";
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const accessToken = req.cookies.get("rawreply_access_token")?.value;
  const refreshToken = req.cookies.get("rawreply_refresh_token")?.value;

  let verifiedPayload = null;

  if (accessToken) {
    try {
      const secret = getJwtSecret();
      const { payload } = await jwtVerify(accessToken, secret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      verifiedPayload = payload;
    } catch {
      // Access token expired or invalid
    }
  }

  // 0. Root URL redirection for logged-in users
  if (isRootRoute) {
    if (verifiedPayload) {
      const destinationUrl = req.nextUrl.clone();
      destinationUrl.pathname = verifiedPayload.adm ? "/admin" : "/dashboard";
      return NextResponse.redirect(destinationUrl);
    }
    if (refreshToken) {
      const destinationUrl = req.nextUrl.clone();
      destinationUrl.pathname = "/dashboard";
      return NextResponse.redirect(destinationUrl);
    }
  }

  // 1. Super Admin Dashboard protection (/admin/*)
  if (isAdminRoute) {
    if (!verifiedPayload && !refreshToken) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If access token is verified and user is not super admin, forbid access and send to customer dashboard
    if (verifiedPayload && !verifiedPayload.adm) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    const response = NextResponse.next();
    if (verifiedPayload) {
      response.headers.set("x-user-id", verifiedPayload.sub || "");
      response.headers.set("x-is-super-admin", "true");
    }
    return response;
  }

  // 2. Customer Dashboard protection (/dashboard/*)
  if (isDashboardRoute) {
    if (!verifiedPayload && !refreshToken) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.next();
    if (verifiedPayload) {
      response.headers.set("x-user-id", verifiedPayload.sub || "");
      response.headers.set("x-org-id", verifiedPayload.org || "");
      response.headers.set("x-user-role", verifiedPayload.rol || "member");
    }
    return response;
  }

  // 3. Auth routes redirect if already authenticated
  if (isAuthRoute && verifiedPayload) {
    const destinationUrl = req.nextUrl.clone();
    destinationUrl.pathname = verifiedPayload.adm ? "/admin" : "/dashboard";
    return NextResponse.redirect(destinationUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/dashboard/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/api/:path*",
  ],
};
