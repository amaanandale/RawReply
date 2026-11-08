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
        const isPlatform = acc.organizationId === "org_platform_super_admin";
        let organizationName = isPlatform ? "Platform Control Plane" : "Unknown Workspace";
        let customerName = isPlatform ? "Super Admin Platform" : "Unknown Customer";
        let customerEmail = isPlatform ? "admin@rawreply.com" : "Unknown";
        let customerId = null;

        if (!isPlatform && acc.organizationId) {
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
          isPlatformAccount: isPlatform,
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

    const platformAccounts = enriched.filter((a) => a.isPlatformAccount);
    const customerAccounts = enriched.filter((a) => !a.isPlatformAccount);

    return NextResponse.json({
      success: true,
      platformAccounts,
      customerAccounts,
      integrations: enriched,
      total: enriched.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const accountId = searchParams.get("accountId");

    if (!organizationId || !accountId) {
      return NextResponse.json({ error: "organizationId and accountId are required." }, { status: 400 });
    }

    const disconnected = await accountStore.disconnectAccount(organizationId, accountId);
    if (!disconnected) {
      return NextResponse.json({ error: "Account could not be found or disconnected." }, { status: 404 });
    }

    await db.createAuditLog({
      action: "ADMIN_DISCONNECT_INSTAGRAM_ACCOUNT",
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      target_type: "instagram_account",
      target_id: accountId,
      details: `Disconnected account ${accountId} from organization ${organizationId}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Account disconnected successfully.",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
