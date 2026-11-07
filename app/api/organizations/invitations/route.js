import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await organizationService.listInvitations(session.organizationId);
  return NextResponse.json({ invitations });
}

