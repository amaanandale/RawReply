import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
    }

    const result = await organizationService.acceptInvitation({
      token,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      organizationId: result.organizationId,
      role: result.role,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

