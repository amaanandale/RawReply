import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

export async function GET(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Automation ID is required." }, { status: 400 });
  }

  try {
    const automation = await db.findAutomationById(id);
    if (!automation) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    if (automation.organization_id !== session.organizationId && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const executions = await db.listAutomationExecutions(id, { limit });

    return NextResponse.json({
      success: true,
      executions,
      total: executions.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
