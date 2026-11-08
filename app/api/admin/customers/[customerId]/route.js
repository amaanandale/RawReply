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
          accounts,
          leadCount,
        };
      })
    );

    // Compute aggregated metrics across customer's workspaces
    const totalAccounts = enrichedOrgs.reduce((acc, o) => acc + o.accounts.length, 0);
    const totalLeads = enrichedOrgs.reduce((acc, o) => acc + (o.leadCount || 0), 0);

    return NextResponse.json({
      success: true,
      customer: {
        ...details.user,
        totalAccounts,
        totalLeads,
      },
      organizations: enrichedOrgs,
      loginHistory: details.loginHistory || [],
      errors: details.errors || [],
      auditHistory: details.auditHistory || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

