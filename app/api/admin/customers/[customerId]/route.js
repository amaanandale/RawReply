import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import { leadStore } from "@/lib/storage/lead-store";

export async function GET(req, { params }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { customerId } = await params;
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
    }

    const details = await db.findCustomerDetails(customerId);
    if (!details) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Attach live Instagram accounts and lead counts for each organization
    const enrichedOrgs = await Promise.all(
      details.organizations.map(async (org) => {
        const accounts = await accountStore.listAccounts(org.id).catch(() => []);
        let leadCount = 0;
        try {
          const leads = await leadStore.listLeads(org.id, { limit: 1 }).catch(() => ({ total: 0 }));
          leadCount = leads.total || 0;
        } catch {
          // ignore
        }

        return {
          ...org,
          accounts: accounts.map((a) => ({
            id: a.id,
            instagramId: a.instagramId || a.id,
            username: a.username,
            accountType: a.accountType || "BUSINESS",
            profilePictureUrl: a.profilePictureUrl || null,
            status: a.status || "connected",
            connectedAt: a.connectedAt || a.created_at,
          })),
          leadCount,
        };
      })
    );

    // Aggregate all Instagram accounts
    const allAccounts = enrichedOrgs.flatMap((o) => o.accounts || []);
    const connectedAccounts = allAccounts.filter((a) => a.status === "connected");
    const totalLeads = enrichedOrgs.reduce((acc, o) => acc + (o.leadCount || 0), 0);

    const automations = details.automations || [];
    const activeAutomationsCount = automations.filter((a) => a.status === "active").length;
    const inactiveAutomationsCount = automations.filter((a) => a.status !== "active").length;

    return NextResponse.json({
      success: true,
      customer: {
        ...details.user,
        auth_provider: details.user.auth_provider || "email_otp",
        email_verified: Boolean(details.user.email_verified_at || details.user.auth_provider === "google"),
        totalAccounts: connectedAccounts.length,
        maxAccounts: 4,
        totalLeads,
        totalAutomations: automations.length,
        activeAutomations: activeAutomationsCount,
        inactiveAutomations: inactiveAutomationsCount,
      },
      instagramAccounts: allAccounts,
      subscription: {
        plan: "Free Launch Plan",
        status: "Active",
        billingCycle: "Free",
        price: "$0",
        features: [
          "Up to 4 Instagram accounts",
          "Unlimited DM & comment automations",
          "Verified phone lead qualification gate",
          "Excel / Sheets export integration",
        ],
        created_at: details.user.created_at,
      },
      automations: automations.map((a) => ({
        id: a.id,
        name: a.name,
        triggerKeyword: a.triggerKeyword || a.trigger_keyword || "Any Keyword",
        replyText: a.replyText || a.reply_text || a.commentReplyText || a.comment_reply_text || "Automated Response",
        status: a.status || "active",
        created_at: a.created_at,
        organization_id: a.organization_id,
      })),
      organizations: enrichedOrgs,
      loginHistory: details.loginHistory || [],
      errors: details.errors || [],
      auditHistory: details.auditHistory || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
