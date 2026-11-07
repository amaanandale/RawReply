import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    // Automations are scoped to user workspaces. No dummy data.
    return NextResponse.json({
      success: true,
      automations: [],
      total: 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

