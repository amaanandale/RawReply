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
    const { targetUserId, newRole } = body;
    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: "targetUserId and newRole are required" }, { status: 400 });
    }

    const updated = await organizationService.updateMemberRole({
      orgId: session.organizationId,
      targetUserId,
      newRole,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

