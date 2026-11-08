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
  PhoneCall,
  MessageSquare,
  LogIn,
  AlertOctagon,
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
              Database-Backed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            System overview, customer workspaces, authentication monitoring and platform health.
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
        {/* Customers */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Customers</span>
              <Users className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalCustomers : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="text-emerald-600 font-semibold">{metrics?.activeCustomers ?? 0} active</span>
              {Boolean(metrics?.suspendedCustomers) && (
                <span className="text-destructive font-medium">{metrics.suspendedCustomers} suspended</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Organizations</span>
              <Building2 className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalOrganizations : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Multi-tenant customer workspaces
            </p>
          </CardContent>
        </Card>

        {/* Instagram Accounts */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Instagram Integrations</span>
              <Instagram className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.connectedAccounts ?? metrics.activeIntegrations ?? 0 : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-emerald-600 font-semibold">{metrics?.connectedAccounts ?? 0} connected</span>
              {Boolean(metrics?.disconnectedAccounts) && (
                <span className="text-muted-foreground ml-1.5">({metrics.disconnectedAccounts} disconnected)</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Captured Leads */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Captured Leads</span>
              <PhoneCall className="size-3.5 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {metrics ? metrics.totalCapturedLeads : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Verified mobile phone qualification gate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics: Conversations, Comments, Logins & Errors */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Conversations & Messages */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="size-3" />
              Conversations
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {metrics ? metrics.totalConversations : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-[10px] text-muted-foreground">
              {metrics ? metrics.totalComments : 0} comments processed
            </p>
          </CardContent>
        </Card>

        {/* Authentication Success */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <LogIn className="size-3 text-emerald-600" />
              Successful Logins
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground text-emerald-600">
              {metrics ? metrics.successfulLogins : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-[10px] text-muted-foreground">
              Verified sessions created
            </p>
          </CardContent>
        </Card>

        {/* Failed Login Attempts */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-3 text-amber-600" />
              Failed Logins
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {metrics ? metrics.failedLogins : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-[10px] text-muted-foreground">
              Security anomalies logged
            </p>
          </CardContent>
        </Card>

        {/* System Errors */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertOctagon className="size-3 text-destructive" />
              System Errors
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground">
              {metrics ? metrics.systemErrors : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-[10px] text-muted-foreground">
              {metrics ? metrics.totalAuditLogs : 0} total audit records
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
              <span className="text-muted-foreground">Database Storage</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> PostgreSQL
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">JWT Session Guard</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Active (HS256)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Instagram Unified Login</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Config ID 1106955532119603
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-muted-foreground">Webhook Verification</span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> HMAC-SHA256
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
                        {log.action?.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        By {log.actor_email} • Target: {log.target_type} ({log.target_id || "global"})
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
