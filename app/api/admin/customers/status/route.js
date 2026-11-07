import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export async function POST(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { userId, status, reason } = await req.json();

    if (!userId || !["active", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Valid userId and status ('active' or 'suspended') are required." },
        { status: 400 }
      );
    }

    // Protect against self-suspension
    if (userId === auth.user.id && status === "suspended") {
      return NextResponse.json(
        { error: "You cannot suspend your own Super Admin account." },
        { status: 400 }
      );
    }

    const updated = await db.setCustomerStatus(userId, status);
    if (!updated) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // If suspended, terminate all current active sessions immediately
    if (status === "suspended") {
      await db.revokeAllUserSessions(userId);
    }

    await db.recordAuditLog({
      action: status === "suspended" ? "customer_suspended" : "customer_reactivated",
      performedBy: auth.user.id,
      targetType: "user",
      targetId: userId,
      details: {
        newStatus: status,
        reason: reason || "Administrative action by Super Admin",
        adminEmail: auth.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      customer: updated,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

