import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { exportStore } from "@/lib/storage/export-store";

/**
 * GET /api/leads/export/history
 * Returns the export audit trail for the organization.
 */
export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const history = await exportStore.listHistory(session.organizationId, limit);
  return NextResponse.json({ history });
}

