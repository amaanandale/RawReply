import { NextResponse } from "next/server";
import { getCurrentSession, switchActiveOrganization } from "@/lib/auth/session";
import { setAuthCookies } from "@/lib/auth/cookies";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { organizationId } = body;
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const result = await switchActiveOrganization({
      sessionId: session.sessionId,
      userId: session.user.id,
      organizationId,
    });

    const response = NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      role: result.role,
    });

    setAuthCookies(response, {
      accessToken: result.accessToken,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

