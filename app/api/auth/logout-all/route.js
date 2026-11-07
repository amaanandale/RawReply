import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { authService } from "@/services/auth-service";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await authService.logoutAll(session.user.id);

  const response = NextResponse.json({
    success: true,
    message: "Logged out from all devices successfully",
  });
  clearAuthCookies(response);
  return response;
}

