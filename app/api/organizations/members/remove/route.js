import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetUserId } = body;
    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    await organizationService.removeMember({
      orgId: session.organizationId,
      targetUserId,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

