import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { Plus, CheckCircle, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { accountStore } from "@/lib/storage/account-store";
import { AccountsClient } from "@/components/dashboard/accounts-client";

export const metadata = {
  title: "Instagram Accounts — RawReply",
  description: "Connect and manage Instagram Professional accounts for comment-to-DM automation.",
};

async function AccountsDataWrapper() {
  let organizationId = "default_org";
  try {
    const cookieStore = await cookies();
    const session = await getCurrentSession({ cookies: cookieStore });
    if (session?.organizationId) {
      organizationId = session.organizationId;
    }
  } catch {
    // Local dev
  }

  const isConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET
  );

  const accounts = await accountStore.listAccounts(organizationId);
  return (
    <AccountsClient
      initialAccounts={accounts}
      isConfigured={isConfigured}
    />
  );
}

export default function InstagramAccountsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Instagram Accounts"
        description="Connect your Instagram Business or Creator accounts via the official Meta Graph API v21.0."
        actions={
          <Button size="sm" asChild className="min-h-[44px] sm:min-h-[36px]">
            <a href="/api/auth/meta/authorize">
              <Plus className="size-4 mr-1.5" />
              Connect Account
            </a>
          </Button>
        }
      />

      {/* Main Account Management Interface with Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <AccountsDataWrapper />
      </Suspense>

      {/* Technical Architecture & Requirements Guide */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Requirements</CardTitle>
            <CardDescription>
              Meta requires the following configuration to grant comment and DM webhooks:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RequirementItem
              title="Instagram Professional Account"
              description="Personal Instagram accounts cannot receive automated webhook events. You must switch to a Business or Creator account in Instagram settings."
            />
            <RequirementItem
              title="Connected Facebook Page"
              description="Your Instagram Business profile must be linked to a Facebook Page where you hold Admin or Task access."
            />
            <RequirementItem
              title="Meta Graph API Permissions"
              description="RawReply requests instagram_manage_comments, instagram_manage_messages, and pages_manage_metadata permissions."
            />
          </CardContent>
        </Card>

        {/* Messaging Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Meta Messaging Compliance</CardTitle>
            <CardDescription>
              RawReply operates strictly within Instagram&apos;s official API limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldAlert className="size-4 text-primary-accent" />
                <span>The 24-Hour Messaging Window</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a user comments on your post, RawReply sends an initial private reply. Once the user replies in DM, a standard 24-hour messaging window opens.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Important Meta Rules:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>No spam or bulk unsolicited cold DMs.</li>
                <li>One initial DM per eligible comment.</li>
                <li>No duplicate DMs to the same commenter on the same post.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RequirementItem({ title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/80 bg-muted/20 p-3">
      <CheckCircle className="size-4 shrink-0 text-emerald-600 mt-0.5" />
      <div>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">
          {description}
        </p>
      </div>
    </div>
  );
}
