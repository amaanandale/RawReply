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
      { error: "You do not have permission to configure integrations." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { workbook, worksheet } = body;

  try {
    const updated = await integrationStore.updateWorkbookConfig(
      session.organizationId,
      { workbook, worksheet }
    );

    return NextResponse.json({ success: true, integration: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update integration configuration" },
      { status: 400 }
    );
  }
}

