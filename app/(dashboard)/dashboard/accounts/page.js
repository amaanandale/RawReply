import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { Plus, CheckCircle, ShieldAlert } from "lucide-react";
import { Instagram, Facebook } from "@/components/shared/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { accountStore } from "@/lib/storage/account-store";
import { AccountsClient } from "@/components/dashboard/accounts-client";
import { META_DEFAULT_APP_ID, META_DEFAULT_APP_SECRET } from "@/lib/meta/constants";

export const metadata = {
  title: "Connected Accounts — RawReply",
  description: "Connect and manage Instagram Professional accounts and Facebook Pages for automated comment-to-DM workflows.",
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
    (process.env.META_APP_ID || META_DEFAULT_APP_ID) &&
    (process.env.META_APP_SECRET || META_DEFAULT_APP_SECRET)
  );

  const accounts = await accountStore.listAccounts(organizationId);
  return (
    <AccountsClient
      initialAccounts={accounts}
      isConfigured={isConfigured}
    />
  );
}

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Connected Accounts"
        description="Connect your Instagram Professional accounts and Facebook Pages via the official Meta Graph API v21.0."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" asChild variant="outline" className="min-h-[44px] sm:min-h-[36px] border-primary-accent/30 hover:bg-primary-accent/5">
              <a href="/api/auth/meta/authorize?platform=instagram">
                <Instagram className="size-4 mr-1.5 text-primary-accent" />
                Connect Instagram
              </a>
            </Button>
            <Button size="sm" asChild className="min-h-[44px] sm:min-h-[36px] bg-[#1877F2] hover:bg-[#166FE5] text-white">
              <a href="/api/auth/meta/authorize?platform=facebook">
                <Facebook className="size-4 mr-1.5 text-white" />
                Connect Facebook Page
              </a>
            </Button>
          </div>
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
            <CardTitle>Platform Connection Requirements</CardTitle>
            <CardDescription>
              Meta requires the following configurations to grant comment and DM webhook access:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RequirementItem
              title="Instagram Professional Account"
              description="Must be an Instagram Business or Creator account linked to a Facebook Page where you hold administrative access."
            />
            <RequirementItem
              title="Facebook Business Page"
              description="You must be an Admin or Task manager on the Facebook Page with pages_manage_posts and pages_messaging permissions."
            />
            <RequirementItem
              title="Meta Graph API v21.0 Permissions"
              description="RawReply requests official scopes: instagram_manage_comments, instagram_manage_messages, pages_manage_posts, and pages_messaging."
            />
          </CardContent>
        </Card>

        {/* Messaging Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Meta Messaging Compliance</CardTitle>
            <CardDescription>
              RawReply operates strictly within Instagram and Facebook official API policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <ShieldAlert className="size-4 text-primary-accent" />
                <span>The 7-Day & 24-Hour Windows</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a customer comments on an Instagram or Facebook post, RawReply can reply privately within 7 days. Once the user replies in DM, a 24-hour conversational window opens.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Important Meta Rules:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>No spam or bulk unsolicited cold messages.</li>
                <li>Single automated private reply per comment.</li>
                <li>Strict idempotency: no repeated triggers on the same comment.</li>
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
