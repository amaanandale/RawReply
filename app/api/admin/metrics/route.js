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
        totalCustomers: platformMetrics.totalCustomers ?? platformMetrics.totalUsers ?? 0,
        customersViaEmailOtp: platformMetrics.customersViaEmailOtp ?? 0,
        customersViaGoogle: platformMetrics.customersViaGoogle ?? 0,
        customersWithVerifiedEmail: platformMetrics.customersWithVerifiedEmail ?? 0,
        customersWithConnectedInstagram: platformMetrics.customersWithConnectedInstagram ?? 0,
        customersWithConnectedFacebook: platformMetrics.customersWithConnectedFacebook ?? 0,
        connectedAccounts: platformMetrics.connectedAccounts ?? activeIntegrationsCount,
        connectedInstagramAccounts: platformMetrics.connectedInstagramAccounts ?? 0,
        connectedFacebookPages: platformMetrics.connectedFacebookPages ?? 0,
        disconnectedAccounts: platformMetrics.disconnectedAccounts ?? Math.max(0, instagramAccounts.length - activeIntegrationsCount),
        totalActiveAutomations: platformMetrics.totalActiveAutomations ?? 0,
        instagramAutomations: platformMetrics.instagramAutomations ?? 0,
        facebookAutomations: platformMetrics.facebookAutomations ?? 0,
        totalCreatedAutomations: platformMetrics.totalCreatedAutomations ?? 0,
        instagramLeads: platformMetrics.instagramLeads ?? 0,
        facebookLeads: platformMetrics.facebookLeads ?? 0,
        freeSubscriptions: platformMetrics.freeSubscriptions ?? (platformMetrics.totalCustomers ?? platformMetrics.totalUsers ?? 0),
        activeCustomers: platformMetrics.activeCustomers ?? platformMetrics.activeUsers ?? 0,
        suspendedCustomers: platformMetrics.suspendedCustomers ?? 0,
        totalOrganizations: platformMetrics.totalOrganizations ?? 0,
        totalCapturedLeads: leadsCount ?? 0,
        totalConversations: platformMetrics.totalConversations ?? 0,
        totalComments: platformMetrics.totalComments ?? 0,
        successfulLogins: platformMetrics.successfulLogins ?? 0,
        failedLogins: platformMetrics.failedLogins ?? 0,
        systemErrors: platformMetrics.systemErrors ?? 0,
        totalAuditLogs: platformMetrics.totalAuditLogs ?? 0,
        recentRegistrations: platformMetrics.recentUsers ?? [],
        recentConnections: platformMetrics.recentConnections ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
