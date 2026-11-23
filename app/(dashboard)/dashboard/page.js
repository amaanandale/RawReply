import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { Plus } from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { accountStore } from "@/lib/storage/account-store";
import { leadStore } from "@/lib/storage/lead-store";
import { db } from "@/lib/db/client";
import { DashboardOverviewClient } from "@/components/dashboard/dashboard-overview-client";

export const metadata = {
  title: "Dashboard Overview — RawReply",
  description: "Monitor your Instagram comment automation and qualified lead collection.",
};

async function DashboardOverviewDataWrapper() {
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

  const [accounts, leadStats, automations] = await Promise.all([
    accountStore.listAccounts(organizationId),
    leadStore.getLeadStats(organizationId).catch(() => ({ totalLeads: 0, leadsToday: 0 })),
    db.listAutomations(organizationId).catch(() => []),
  ]);

  const isConnected = accounts.length > 0;
  const primaryAccount = isConnected ? accounts[0] : null;

  const initialOverviewData = {
    accounts,
    isConnected,
    primaryAccount,
    stats: {
      qualifiedLeads: leadStats?.totalLeads || 0,
      activeAutomations: (automations || []).filter((a) => a.status === "active").length,
      connectedAccounts: accounts.length,
      leadsToday: leadStats?.leadsToday || 0,
      totalAutomations: (automations || []).length,
    },
    automations: (automations || []).slice(0, 5),
  };

  return <DashboardOverviewClient initialOverviewData={initialOverviewData} />;
}

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Dashboard Overview"
        description="Monitor automated Instagram conversations, lead qualification, and connected integrations."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/accounts">
                <Instagram className="size-4 mr-1.5" />
                Manage Accounts
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-primary-accent hover:bg-primary-accent-dark text-white font-semibold">
              <Link href="/dashboard/automations">
                <Plus className="size-4 mr-1.5" />
                New Automation
              </Link>
            </Button>
          </div>
        }
      />

      {/* Dynamic Data wrapped in Suspense for Next.js 16 partial prerendering */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-72 rounded-xl lg:col-span-2" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        }
      >
        <DashboardOverviewDataWrapper />
      </Suspense>
    </div>
  );
}
