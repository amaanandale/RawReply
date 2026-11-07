import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { leadStore } from "@/lib/storage/lead-store";
import { LeadsClient } from "@/components/dashboard/leads-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Qualified Leads — RawReply",
  description: "View and export verified leads who completed DM requirements and submitted their phone number.",
};

async function LeadsDataWrapper() {
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

  const initialData = await leadStore.listLeads(organizationId, { limit: 100 });
  const initialStats = await leadStore.getLeadStats(organizationId);

  return <LeadsClient initialData={initialData} initialStats={initialStats} />;
}

export default function QualifiedLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-md" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <LeadsDataWrapper />
    </Suspense>
  );
}
