import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";

export async function GET(req) {
  const session = await getCurrentSession(req);

  if (!session) {
    const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const organizations = await organizationService.getUserOrganizations(session.user.id);

  const response = NextResponse.json({
    authenticated: true,
    user: session.user,
    organization: session.organization,
    role: session.role,
    organizations,
  });

  // If tokens were auto-rotated during refresh, attach updated cookies
  if (session.rotatedTokens) {
    setAuthCookies(response, session.rotatedTokens);
  }

  return response;
}

