import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export async function POST(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { organizationId, status, reason } = await req.json();

    if (!organizationId || !["active", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Valid organizationId and status ('active' or 'suspended') are required." },
        { status: 400 }
      );
    }

    const updated = await db.setOrganizationStatus(organizationId, status);
    if (!updated) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    await db.recordAuditLog({
      action: status === "suspended" ? "organization_suspended" : "organization_reactivated",
      performedBy: auth.user.id,
      targetType: "organization",
      targetId: organizationId,
      details: {
        newStatus: status,
        reason: reason || "Administrative action by Super Admin",
        adminEmail: auth.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      organization: updated,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

