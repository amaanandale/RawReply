import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { integrationStore } from "@/lib/storage/integration-store";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.role, PERMISSIONS.MANAGE_INTEGRATIONS)) {
    return NextResponse.json(
      { error: "You do not have permission to disconnect integrations." },
      { status: 403 }
    );
  }

  await integrationStore.disconnect(session.organizationId);

  return NextResponse.json({ success: true });
}

