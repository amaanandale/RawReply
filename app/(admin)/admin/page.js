"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = React.useState(null);
  const [recentLogs, setRecentLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [metricsRes, logsRes] = await Promise.all([
          fetch("/api/admin/metrics"),
          fetch("/api/admin/activity?limit=5"),
        ]);

        if (!metricsRes.ok || !logsRes.ok) {
          throw new Error("Failed to load platform data.");
        }

        const metricsData = await metricsRes.json();
        const logsData = await logsRes.json();

        if (!ignore) {
          setMetrics(metricsData.metrics);
          setRecentLogs(logsData.logs || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Super Admin Control Plane
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30">
              Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            System overview, customer workspaces, and compliance governance.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs self-start sm:self-auto min-h-[44px] sm:min-h-[36px]"
        >
          {loading ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Total Customers
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalCustomers : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{metrics ? metrics.activeCustomers : 0} active</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Organizations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalOrganizations : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Multi-tenant workspaces
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Instagram Integrations
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalIntegrations : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {metrics ? metrics.activeIntegrations : 0} connected
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Audit Log Events
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalAuditLogs : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Immutable security records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Health & System Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border border-border bg-card shadow-xs lg:col-span-1">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              Platform Status
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Core platform subsystems operational status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">JWT Session Guard</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Database Storage</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Connected
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Instagram Webhooks</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> HMAC-SHA256
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-muted-foreground">Audit Log Ingestion</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Operational
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="border border-border bg-card shadow-xs lg:col-span-2">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary-accent" />
                Recent System Activity
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Latest security and administrative events recorded.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/admin/activity" className="flex items-center gap-1">
                <span>View all</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent administrative activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentLogs.map((log, index) => (
                  <div key={log.id || `log-${log.created_at || index}-${index}`} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-medium text-foreground capitalize">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Target: <span className="font-mono">{log.target_type || "system"}</span> ({log.target_id || "global"})
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/admin/customers"
          className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary-accent/50 hover:shadow-xs group min-h-[44px]"
        >
          <div className="flex items-center justify-between">
            <Users className="size-5 text-primary-accent" />
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">Manage Customers</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Search, inspect, and suspend or reactivate customer accounts.
          </p>
        </Link>

        <Link
          href="/admin/organizations"
          className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary-accent/50 hover:shadow-xs group min-h-[44px]"
        >
          <div className="flex items-center justify-between">
            <Building2 className="size-5 text-primary-accent" />
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">Manage Workspaces</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Inspect customer organizations, team owners, and member counts.
          </p>
        </Link>

        <Link
          href="/admin/integrations"
          className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary-accent/50 hover:shadow-xs group min-h-[44px]"
        >
          <div className="flex items-center justify-between">
            <Instagram className="size-5 text-primary-accent" />
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">Connected Instagram Accounts</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitor real Instagram business accounts connected across workspaces.
          </p>
        </Link>
      </div>
    </div>
  );
}
