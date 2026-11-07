import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";
import { inviteMemberSchema } from "@/lib/validations/auth";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await organizationService.listMembers(session.organizationId);
  return NextResponse.json({ members });
}

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = inviteMemberSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`;

    const result = await organizationService.inviteMember({
      orgId: session.organizationId,
      actorUserId: session.user.id,
      email: validated.data.email,
      role: validated.data.role,
      appUrl,
    });

    return NextResponse.json({
      success: true,
      message: `Invitation dispatched to ${validated.data.email}`,
      invite: result.invite,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

