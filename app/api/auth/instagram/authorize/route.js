import { NextResponse } from "next/server";

/**
 * GET /api/auth/instagram/authorize
 * Transparent forwarder to /api/auth/meta/authorize?platform=instagram.
 *
 * In Meta's platform architecture, Instagram Professional accounts using Facebook Business App IDs
 * (META_APP_ID: 1531237922145783) must authorize via Meta's Unified Login (facebook.com/dialog/oauth).
 * Direct instagram.com/oauth/authorize rejects Facebook App IDs with "Invalid Request: Invalid platform app".
 * This forwarder ensures any cached links, bookmarks, or direct calls seamlessly route to Meta Unified Login.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const searchParams = new URLSearchParams(url.searchParams);
  if (!searchParams.has("platform")) {
    searchParams.set("platform", "instagram");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;

  const targetUrl = new URL("/api/auth/meta/authorize", appUrl);
  targetUrl.search = searchParams.toString();

  return NextResponse.redirect(targetUrl.toString());
}
