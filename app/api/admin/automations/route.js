import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";

    const automations = await db.listAllAutomations({ status });

    return NextResponse.json({
      success: true,
      automations,
      total: automations.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
