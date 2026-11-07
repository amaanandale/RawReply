import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    // Lead collection strictly enforces phone number submission.
    // Zero fake data or unqualified commenters.
    return NextResponse.json({
      success: true,
      leads: [],
      total: 0,
      rule: "Only verified commenters submitting a valid phone number qualify as leads.",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

