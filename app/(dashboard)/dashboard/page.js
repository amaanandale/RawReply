import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import {
  Users,
  Zap,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { accountStore } from "@/lib/storage/account-store";

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
    // Local dev
  }

  const accounts = await accountStore.listAccounts(organizationId);
  const isConnected = accounts.length > 0;
  const primaryAccount = isConnected ? accounts[0] : null;
  const completedStepsCount = isConnected ? 1 : 0;

  return (
    <div className="space-y-8">
      {/* 4 Core Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Qualified Leads"
          value="0"
          description="Verified phone submissions"
          icon={Users}
        />
        <MetricCard
          title="Active Automations"
          value="0"
          description="0 active workflows"
          icon={Zap}
        />
        <MetricCard
          title="Connected Accounts"
          value={String(accounts.length)}
          description={
            isConnected
              ? `@${primaryAccount.username} connected`
              : "No Instagram accounts connected"
          }
          icon={Instagram}
        />
        <MetricCard
          title="Leads Today"
          value="0"
          description="Captured past 24 hours"
          icon={Calendar}
        />
      </div>

      {/* Getting Started Checklist & Instagram Connection Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting Started Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Getting Started Checklist</CardTitle>
                <CardDescription>
                  Complete these 4 steps to launch your first comment-to-lead automation.
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {completedStepsCount} of 4 Completed
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistStep
              step="1"
              title="Connect your Instagram Business account"
              description="Authorize RawReply to receive post comment webhooks and send automated DMs."
              href="/dashboard/accounts"
              actionLabel={isConnected ? "Manage" : "Connect Account"}
              completed={isConnected}
            />
            <ChecklistStep
              step="2"
              title="Create your first comment trigger"
              description="Choose a post or keyword to automatically initiate the DM conversation flow."
              href="/dashboard/automations"
              actionLabel="Create Trigger"
              completed={false}
            />
            <ChecklistStep
              step="3"
              title="Configure requirement & phone number questions"
              description="Set up your qualifying questions and phone validation gate."
              href="/dashboard/automations"
              actionLabel="Configure Flow"
              completed={false}
            />
            <ChecklistStep
              step="4"
              title="Set up Excel lead export destination"
              description="Configure spreadsheet dispatching so qualified leads are synced instantly."
              href="/dashboard/integrations"
              actionLabel="View Integrations"
              completed={false}
            />
          </CardContent>
        </Card>

        {/* Instagram Account Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Instagram Connection</CardTitle>
            <CardDescription>
              Primary channel for webhook comment triggers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Instagram className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {isConnected ? `@${primaryAccount.username}` : "Instagram API"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isConnected ? `Page: ${primaryAccount.pageName || primaryAccount.pageId}` : "Meta Graph API v21.0"}
                  </p>
                </div>
              </div>
              <StatusBadge
                status={isConnected ? "connected" : "not_connected"}
                label={isConnected ? "Connected" : "Not Connected"}
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {isConnected
                ? "Your Instagram Professional account is linked and receiving post comment webhooks."
                : "To trigger automated DMs, you need an Instagram Business or Creator account connected to a Facebook Page."}
            </p>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/dashboard/accounts">
                {isConnected ? "View Account Details" : "Connect Instagram Account"}
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
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
                Connect Instagram
              </Link>
            </Button>
            <Button size="sm" asChild>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        }
      >
        <DashboardOverviewDataWrapper />
      </Suspense>

      {/* Bottom Grid: Recent Leads & Automation Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Qualified Leads</CardTitle>
              <CardDescription>
                Commenters who answered requirement questions and submitted a valid phone number.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/leads" className="text-xs">
                View all
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No qualified leads captured yet"
              description="When a commenter completes your DM sequence and provides their phone number, they will appear here."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/automations">Setup Automation</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Automations</CardTitle>
              <CardDescription>
                Comment triggers currently active on your Instagram posts.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/automations" className="text-xs">
                View all
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Zap}
              title="No active automations"
              description="Create comment-to-DM workflows to start qualifying leads automatically."
              action={
                <Button size="sm" asChild>
                  <Link href="/dashboard/automations">Create First Automation</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChecklistStep({ step, title, description, href, actionLabel, completed }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground mt-0.5">
          {completed ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : (
            <span>{step}</span>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-foreground">{title}</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">
            {description}
          </p>
        </div>
      </div>
      <Button variant="outline" size="xs" asChild className="shrink-0">
        <Link href={href}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
