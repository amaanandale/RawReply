"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Mail,
  Zap,
  CreditCard,
  Building2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { Instagram, Google, Facebook } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) {
          throw new Error("Failed to load platform database metrics.");
        }
        const data = await res.json();
        if (!ignore) {
          setMetrics(data.metrics || null);
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
              Live Database Queries
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time platform metrics, authentication breakdown, customer accounts, and automation health.
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
          Refresh Metrics
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Main Metric Cards Grid (All 9 Core Direct Database Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Registered Customers */}
        <Link href="/admin/customers" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Registered Customers</span>
                <Users className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.totalCustomers ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="text-emerald-600 font-semibold">{metrics?.activeCustomers ?? 0} active</span>
                {Boolean(metrics?.suspendedCustomers) && (
                  <span className="text-destructive font-medium">{metrics.suspendedCustomers} suspended</span>
                )}
                <span className="ml-auto text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  View All <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 2. Registered via Email OTP */}
        <Link href="/admin/customers?filter=email_otp" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Customers via Email OTP</span>
                <Mail className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.customersViaEmailOtp ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Secure 6-digit OTP verification</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Filter <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 3. Registered via Google */}
        <Link href="/admin/customers?filter=google" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Customers via Google</span>
                <Google className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.customersViaGoogle ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Google OAuth 2.0 verified</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Filter <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Customers with Verified Email */}
        <Link href="/admin/customers?filter=verified" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Verified Email Customers</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.customersWithVerifiedEmail ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Confirmed active identities</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Filter <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 5. Connected Instagram Accounts */}
        <Link href="/admin/integrations" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Connected Instagram</span>
                <Instagram className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.connectedInstagramAccounts ?? metrics?.customersWithConnectedInstagram ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Active Instagram Business/Creators</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Integrations <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 6. Connected Facebook Pages */}
        <Link href="/admin/integrations" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-blue-500/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Connected Facebook Pages</span>
                <Facebook className="size-4 text-[#1877F2] transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-[#1877F2]">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.connectedFacebookPages ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Authorized Facebook Business Pages</span>
                <span className="text-[#1877F2] opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Integrations <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 7. Total Active Automations */}
        <Link href="/admin/automations?status=active" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Active Automations</span>
                <Zap className="size-4 text-emerald-600" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.totalActiveAutomations ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Currently active live workflows</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Automations <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 8. Total Created Automations */}
        <Link href="/admin/automations" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Created Automations</span>
                <Layers className="size-4 text-muted-foreground group-hover:text-primary-accent transition-colors" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.totalCreatedAutomations ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Total workflows configured</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  View All <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 9. Active Subscriptions (Free Launch Plan) */}
        <Link href="/admin/subscriptions" className="block group">
          <Card className="h-full border border-border bg-card shadow-xs transition-all hover:border-primary-accent/50 hover:shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Free Launch Subscriptions</span>
                <CreditCard className="size-4 text-primary-accent" />
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {loading ? <Loader2 className="size-5 animate-spin inline" /> : (metrics?.freeSubscriptions ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span className="text-emerald-600 font-semibold">100% Free full launch access</span>
                <span className="text-primary-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[10px] font-medium">
                  Subscriptions <ArrowRight className="size-3 ml-0.5" />
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity Sections: Registrations & Account Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customer Registrations */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-primary-accent" />
                Recent Customer Registrations
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Latest customers onboarded directly from database.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/admin/customers" className="flex items-center gap-1">
                <span>View all</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary-accent mb-1" />
                <span>Loading recent registrations...</span>
              </div>
            ) : !metrics?.recentRegistrations || metrics.recentRegistrations.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent customer registrations recorded in database.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {metrics.recentRegistrations.slice(0, 5).map((user) => (
                  <div key={user.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{user.name || "Customer"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {user.auth_provider || "email_otp"}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Social Account Connections */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Instagram className="size-4 text-primary-accent" />
                Recent Social Account Connections
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Latest Instagram & Facebook OAuth integrations registered.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/admin/integrations" className="flex items-center gap-1">
                <span>View all</span>
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary-accent mb-1" />
                <span>Loading recent account connections...</span>
              </div>
            ) : !metrics?.recentConnections || metrics.recentConnections.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent account connections recorded.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {metrics.recentConnections.slice(0, 5).map((acc) => {
                  const isFb = acc.platform === "facebook";
                  return (
                    <div key={acc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <div
                          className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                            isFb ? "bg-blue-50 text-[#1877F2]" : "bg-primary-accent/10 text-primary-accent"
                          }`}
                        >
                          {isFb ? <Facebook className="size-3.5" /> : <Instagram className="size-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {isFb ? acc.username : `@${acc.username}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            Workspace: {acc.organization_id || "Customer"} • {isFb ? "Facebook Page" : "Instagram"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-semibold ${
                            acc.status === "connected" ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                          }`}
                        >
                          {acc.status || "connected"}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {acc.connected_at ? new Date(acc.connected_at).toLocaleDateString() : "Active"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health Checkpoints */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            Platform Subsystem Health & Integrity
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Cryptographic authentication, multi-tenant isolation, and database verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">Database Provider</span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> PostgreSQL / Storage
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">JWT Session Guard</span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> HS256 + HttpOnly
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">Meta Graph API</span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> v21.0 Unified Login
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">Account Limit Gate</span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Max 4 / Customer
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
