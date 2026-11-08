import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { accountStore } from "@/lib/storage/account-store";
import { db } from "@/lib/db/client";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const rawAccounts = await accountStore.listAllAccounts();

    // Enrich accounts with organization name, owner customer, and activity metadata
    const enriched = await Promise.all(
      rawAccounts.map(async (acc) => {
        let organizationName = "Unknown Workspace";
        let customerName = "Unknown Customer";
        let customerEmail = "Unknown";
        let customerId = null;

        if (acc.organizationId) {
          const org = await db.findOrganizationById(acc.organizationId);
          if (org) organizationName = org.name;

          const members = await db.listOrganizationMembers(acc.organizationId).catch(() => []);
          const owner = members.find((m) => m.role === "owner") || members[0];
          if (owner) {
            customerName = owner.name;
            customerEmail = owner.email;
            customerId = owner.user_id;
          }
        }

        return {
          id: acc.id,
          instagramAccountId: acc.instagramBusinessId || acc.id,
          username: acc.username,
          name: acc.name,
          accountType: acc.accountType || "BUSINESS",
          status: acc.status || "connected",
          organizationId: acc.organizationId,
          organizationName,
          customerId,
          customerName,
          customerEmail,
          pageId: acc.pageId,
          pageName: acc.pageName,
          connectedAt: acc.connectedAt,
          tokenExpiresAt: acc.tokenExpiresAt || null,
          lastActivityAt: acc.lastActivityAt || acc.lastSyncedAt || acc.connectedAt,
          lastWebhookAt: acc.lastWebhookAt || null,
          lastError: acc.lastError || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      integrations: enriched,
      total: enriched.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
