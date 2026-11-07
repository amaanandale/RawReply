import Link from "next/link";
import { Zap, Plus, Search, Filter, HelpCircle, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Automations — RawReply",
  description: "Manage your Instagram comment-to-DM triggers and lead qualification workflows.",
};

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Automations"
        description="Configure comment triggers, questionnaire sequences, and phone number collection gates."
        actions={
          <Button size="sm" asChild>
            <Link href="#create-automation">
              <Plus className="size-4" />
              Create Automation
            </Link>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search automations by post or keyword..."
                className="pl-8 text-xs"
                disabled
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                className="rounded-md bg-primary-accent-light px-2.5 py-1 font-semibold text-primary-accent"
              >
                All (0)
              </button>
              <button
                type="button"
                className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                Active (0)
              </button>
              <button
                type="button"
                className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                Draft (0)
              </button>
              <button
                type="button"
                className="rounded-md px-2.5 py-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                Paused (0)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Empty State */}
      <EmptyState
        icon={Zap}
        title="No automations created yet"
        description="Set up your first comment-to-DM workflow. When someone comments on an Instagram post, RawReply will initiate the qualifying conversation."
        action={
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button size="sm" asChild>
              <Link href="#create-automation">
                <Plus className="size-4" />
                Create Your First Automation
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/accounts">Check Connected Accounts</Link>
            </Button>
          </div>
        }
      />

      {/* Workflow Architecture Explainer */}
      <div className="grid gap-4 sm:grid-cols-3">
        <WorkflowExplainerCard
          step="01"
          title="Comment Detection"
          description="A user comments on your post with an eligible trigger keyword or question."
        />
        <WorkflowExplainerCard
          step="02"
          title="Automated DM Qualification"
          description="RawReply sends an interactive DM asking your preconfigured requirement questions."
        />
        <WorkflowExplainerCard
          step="03"
          title="Phone Number Gate"
          description="Only commenters who provide a valid mobile number are permanently stored and exported."
        />
      </div>
    </div>
  );
}

function WorkflowExplainerCard({ step, title, description }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <span className="font-mono text-xs font-semibold text-primary-accent">
        {step}
      </span>
      <h4 className="mt-1.5 text-xs font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
