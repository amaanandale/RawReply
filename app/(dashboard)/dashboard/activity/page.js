"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogIn,
  ShieldCheck,
  PhoneCall,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CustomerActivityPage() {
  const [activities, setActivities] = React.useState([]);
  const [summary, setSummary] = React.useState({ totalIssues: 0, recentLogins: 0 });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadActivity() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

        const res = await fetch(`/api/activity?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load workspace activity.");
        const data = await res.json();

        if (!ignore) {
          setActivities(data.activities || []);
          if (data.summary) setSummary(data.summary);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(loadActivity, search ? 300 : 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [search, typeFilter, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((p) => p + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Activity & Issues"
        description="Monitor automated Instagram workflows, webhook activity, and workspace security events in real time."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs min-h-[44px] sm:min-h-[36px]"
          >
            {loading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
            <span>Workspace Status</span>
            <ShieldCheck className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">Healthy</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Automations active</p>
        </Card>

        <Card className="border border-border bg-card p-4 shadow-xs">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
            <span>Active Alerts</span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{summary.totalIssues}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Requires attention</p>
        </Card>

        <Card className="border border-border bg-card p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
            <span>Security Checkpoints</span>
            <LogIn className="size-4 text-primary-accent" />
          </div>
          <div className="text-xl font-bold text-foreground mt-1">{summary.recentLogins}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Verified logins logged</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events, workflows, or messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter events by type"
            className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          >
            <option value="all">All Events</option>
            <option value="issue">Issues & Notices</option>
            <option value="login">Logins & Security</option>
          </select>
        </div>
      </div>

      {/* Event Timeline */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="size-4 text-primary-accent" />
            Activity Log ({activities.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Tenant-isolated record of actions, webhooks, and notifications.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && activities.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
              <Loader2 className="size-5 animate-spin text-primary-accent" />
              <span>Loading workspace events...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No activity recorded matching your filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((item) => {
                const isIssue = item.kind === "issue";
                const isSuccess = item.status === "success" || item.status === "resolved";

                return (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">
                          {item.title}
                        </span>
                        {isIssue ? (
                          <Badge
                            variant={item.severity === "critical" ? "destructive" : "outline"}
                            className="text-[10px] uppercase font-semibold py-0"
                          >
                            {item.category?.replace(/_/g, " ") || "Issue"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold py-0 ${
                              isSuccess ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : "text-amber-700"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        )}
                        {item.occurrences > 1 && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-mono">
                            {item.occurrences}x
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3" />
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {item.ipAddress && (
                          <span>IP: {item.ipAddress}</span>
                        )}
                      </div>
                    </div>

                    {/* Safe Contextual Actions */}
                    {item.category === "instagram_oauth" && (
                      <Button variant="outline" size="sm" asChild className="text-xs h-8 shrink-0 self-start sm:self-center">
                        <Link href="/dashboard/accounts" className="flex items-center gap-1">
                          <span>Check Accounts</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

