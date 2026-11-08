import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import { leadStore } from "@/lib/storage/lead-store";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const platformMetrics = await db.getPlatformMetrics();
    const instagramAccounts = await accountStore.listAllAccounts();
    const activeIntegrationsCount = instagramAccounts.filter((a) => a.status === "connected").length;

    // Get real leads count if database or store
    let leadsCount = platformMetrics.totalCapturedLeads;
    if (leadsCount === undefined || leadsCount === 0) {
      try {
        const stats = await leadStore.getGlobalStats?.();
        if (stats && stats.totalLeads) leadsCount = stats.totalLeads;
      } catch {
        // fallback
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalCustomers: platformMetrics.totalCustomers ?? platformMetrics.totalUsers,
        activeCustomers: platformMetrics.activeCustomers ?? platformMetrics.activeUsers,
        suspendedCustomers: platformMetrics.suspendedCustomers || 0,
        totalOrganizations: platformMetrics.totalOrganizations || 0,
        connectedAccounts: activeIntegrationsCount,
        disconnectedAccounts: Math.max(0, instagramAccounts.length - activeIntegrationsCount),
        totalIntegrations: instagramAccounts.length,
        activeIntegrations: activeIntegrationsCount,
        totalCapturedLeads: leadsCount || 0,
        totalConversations: platformMetrics.totalConversations || 0,
        totalComments: platformMetrics.totalComments || 0,
        successfulLogins: platformMetrics.successfulLogins || 0,
        failedLogins: platformMetrics.failedLogins || 0,
        systemErrors: platformMetrics.systemErrors || 0,
        totalAuditLogs: platformMetrics.totalAuditLogs || 0,
        recentUsers: platformMetrics.recentUsers || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
