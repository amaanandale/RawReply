import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { accountStore } from "@/lib/storage/account-store";
import { db } from "@/lib/db/client";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const rawAccounts = await accountStore.listAllAccounts();

    // Enrich accounts with organization name
    const enriched = await Promise.all(
      rawAccounts.map(async (acc) => {
        let organizationName = "Unknown Workspace";
        if (acc.organizationId) {
          const org = await db.findOrganizationById(acc.organizationId);
          if (org) organizationName = org.name;
        }
        return {
          ...acc,
          organizationName,
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

