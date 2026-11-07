import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const platformMetrics = await db.getPlatformMetrics();
    const instagramAccounts = await accountStore.listAllAccounts();
    const activeIntegrationsCount = instagramAccounts.filter((a) => a.status === "connected").length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalCustomers: platformMetrics.totalUsers,
        activeCustomers: platformMetrics.activeUsers,
        totalOrganizations: platformMetrics.totalOrganizations,
        totalAuditLogs: platformMetrics.totalAuditLogs,
        totalIntegrations: instagramAccounts.length,
        activeIntegrations: activeIntegrationsCount,
        totalAutomations: 0,
        activeAutomations: 0,
        qualifiedLeads: 0,
        mrr: 0,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

