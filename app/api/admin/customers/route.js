import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const filter = searchParams.get("filter") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      db.listAllCustomers({ search, status, filter, limit, offset }),
      db.countAllCustomers({ search, status, filter }),
    ]);

    const customersWithDetails = await Promise.all(
      customers.map(async (c) => {
        const orgs = await db.listUserOrganizations(c.id);
        let igAccounts = [];
        let automationsCount = 0;

        for (const org of orgs) {
          try {
            const accs = await accountStore.listAccounts(org.id);
            igAccounts.push(...accs);
          } catch {
            // ignore
          }

          try {
            const autos = await db.listAutomations(org.id);
            automationsCount += (autos || []).length;
          } catch {
            // ignore
          }
        }

        const connectedIgCount = igAccounts.filter((a) => a.status === "connected").length;

        return {
          ...c,
          auth_provider: c.auth_provider || "email_otp",
          email_verified: Boolean(c.email_verified_at || c.auth_provider === "google"),
          instagram_accounts_count: connectedIgCount,
          instagram_accounts_limit: 4,
          subscription_status: "Free Launch Plan — Active",
          automations_count: automationsCount,
          organizations: orgs.map((o) => ({ id: o.id, name: o.name, role: o.role })),
        };
      })
    );

    // If filter is instagram / no_instagram, optionally filter in memory if not already in SQL
    let filteredResults = customersWithDetails;
    if (filter === "instagram") {
      filteredResults = filteredResults.filter((c) => c.instagram_accounts_count > 0);
    } else if (filter === "no_instagram") {
      filteredResults = filteredResults.filter((c) => c.instagram_accounts_count === 0);
    }

    return NextResponse.json({
      success: true,
      customers: filteredResults,
      pagination: {
        page,
        limit,
        total: filter === "instagram" || filter === "no_instagram" ? filteredResults.length : total,
        totalPages: Math.ceil((filter === "instagram" || filter === "no_instagram" ? filteredResults.length : total) / limit) || 1,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
