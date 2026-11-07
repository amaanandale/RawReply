import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { authService } from "@/services/auth-service";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST(req) {
  try {
    const session = await getCurrentSession(req);
    if (session?.sessionId) {
      await authService.logout(session.sessionId);
    }
  } catch {
    // proceed to clear cookies regardless
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  clearAuthCookies(response);
  return response;
}

