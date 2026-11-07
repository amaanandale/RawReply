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
    const { invitationId } = body;
    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    await organizationService.cancelInvitation({
      orgId: session.organizationId,
      invitationId,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ success: true, message: "Invitation cancelled" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

