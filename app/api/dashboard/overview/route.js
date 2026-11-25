import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { accountStore } from "@/lib/storage/account-store";
import { leadStore } from "@/lib/storage/lead-store";
import { db } from "@/lib/db/client";

/**
 * GET /api/dashboard/overview
 * Real-time endpoint returning workspace session metrics, connected accounts,
 * recent leads, and automations status for the main dashboard.
 */
export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId || "default_org";

  try {
    const [accounts, leadStats, automations, recentLeadsData] = await Promise.all([
      accountStore.listAccounts(organizationId),
      leadStore.getLeadStats(organizationId).catch(() => ({ totalLeads: 0, leadsToday: 0 })),
      db.listAutomations(organizationId).catch(() => []),
      leadStore.listLeads(organizationId, { limit: 5 }).catch(() => ({ leads: [] })),
    ]);

    const isConnected = accounts.length > 0;
    const primaryAccount = isConnected ? accounts[0] : null;

    const stats = {
      qualifiedLeads: leadStats?.totalLeads || 0,
      activeAutomations: (automations || []).filter((a) => a.status === "active").length,
      connectedAccounts: accounts.length,
      leadsToday: leadStats?.leadsToday || 0,
      totalAutomations: (automations || []).length,
    };

    return NextResponse.json({
      success: true,
      organizationId,
      accounts,
      isConnected,
      primaryAccount,
      stats,
      recentLeads: recentLeadsData?.leads || [],
      automations: (automations || []).slice(0, 5),
    });
  } catch (err) {
    console.error("[API /api/dashboard/overview] Error:", err.message);
    return NextResponse.json(
      { error: `Failed to load dashboard overview: ${err.message}` },
      { status: 500 }
    );
  }
}
