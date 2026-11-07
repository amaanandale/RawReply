import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { organizationService } from "@/services/organization-service";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await organizationService.getUserOrganizations(session.user.id);
  return NextResponse.json({ organizations });
}

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const org = await organizationService.createOrganization({
      userId: session.user.id,
      name,
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

