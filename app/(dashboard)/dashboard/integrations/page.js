import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { accountStore } from "@/lib/storage/account-store";
import { integrationStore } from "@/lib/storage/integration-store";
import { isMicrosoftConfigured } from "@/lib/integrations/microsoft";
import { IntegrationsClient } from "@/components/dashboard/integrations-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Integrations — RawReply",
  description: "Connect Instagram accounts and configure Microsoft Excel export destinations.",
};

async function IntegrationsDataWrapper() {
  let organizationId = "default_org";
  try {
    const cookieStore = await cookies();
    const session = await getCurrentSession({ cookies: cookieStore });
    if (session?.organizationId) {
      organizationId = session.organizationId;
    }
  } catch {
    // Local fallback
  }

  const igAccounts = await accountStore.listAccounts(organizationId);
  const msIntegration = await integrationStore.getIntegration(organizationId);
  const isMsConfigured = isMicrosoftConfigured();

  const initialData = {
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
  };

  return <IntegrationsClient initialData={initialData} />;
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-md" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <IntegrationsDataWrapper />
    </Suspense>
  );
}
