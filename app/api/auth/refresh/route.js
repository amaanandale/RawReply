import { NextResponse } from "next/server";
import { getTokensFromRequest, setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { refreshSession } from "@/lib/auth/session";

export async function POST(req) {
  const { refreshToken } = getTokensFromRequest(req);
  if (!refreshToken) {
    const res = NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const userAgent = req.headers.get("user-agent") || "";
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  const result = await refreshSession(refreshToken, { userAgent, ipAddress });
  if (!result.success) {
    const res = NextResponse.json({ error: result.error }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const response = NextResponse.json({
    success: true,
    userId: result.userId,
    organizationId: result.organizationId,
    role: result.role,
  });

  setAuthCookies(response, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return response;
}

