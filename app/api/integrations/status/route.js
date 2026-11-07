import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { accountStore } from "@/lib/storage/account-store";
import { integrationStore } from "@/lib/storage/integration-store";
import { isMicrosoftConfigured } from "@/lib/integrations/microsoft";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;

  // Instagram Accounts
  const igAccounts = await accountStore.listAccounts(organizationId);

  // Microsoft Integration
  const msIntegration = await integrationStore.getIntegration(organizationId);
  const isMsConfigured = isMicrosoftConfigured();

  return NextResponse.json({
    instagram: {
      connected: igAccounts.length > 0,
      accountsCount: igAccounts.length,
      accounts: igAccounts,
    },
    microsoftExcel: {
      isConfigured: isMsConfigured,
      connected: Boolean(msIntegration?.connected),
      accountEmail: msIntegration?.accountEmail || null,
      displayName: msIntegration?.displayName || null,
      selectedWorkbook: msIntegration?.selectedWorkbook || null,
      selectedWorksheet: msIntegration?.selectedWorksheet || null,
      lastSyncAt: msIntegration?.lastSyncAt || null,
    },
    googleSheets: {
      connected: false,
      status: "coming_soon",
    },
  });
}

