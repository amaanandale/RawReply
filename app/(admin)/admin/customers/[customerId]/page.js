"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Building2,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Zap,
  CreditCard,
  Send,
} from "lucide-react";
import { Instagram, Google } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CustomerDetailContent() {
  const params = useParams();
  const customerId = params?.customerId;
  const router = useRouter();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadCustomer() {
      if (!customerId) return;
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load customer details.");
        }
        const json = await res.json();
        if (!ignore) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId, refreshKey]);

  const handleStatusChange = async (targetStatus) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/customers/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customerId,
          status: targetStatus,
          reason: `Super Admin toggled customer status to ${targetStatus}`,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update status.");

      setActionMessage({
        type: "success",
        text: `Customer status updated to ${targetStatus}.`,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!data?.customer?.email) return;
    setResetLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.customer.email }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to initiate password reset.");
      setActionMessage({
        type: "success",
        text: `Password reset verification email sent to ${data.customer.email}.`,
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-3">
        <Loader2 className="size-6 animate-spin text-primary-accent" />
        <span>Loading customer account record...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link href="/admin/customers" className="flex items-center gap-1.5">
            <ArrowLeft className="size-3.5" />
            <span>Back to Customers</span>
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error || "Customer record could not be found."}</span>
        </div>
      </div>
    );
  }

  const { customer, instagramAccounts = [], subscription, automations = [], organizations = [], loginHistory = [], errors = [], auditHistory = [] } = data;
  const isSuspended = customer.status === "suspended";

  return (
    <div className="space-y-6">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="text-xs h-8">
          <Link href="/admin/customers" className="flex items-center gap-1.5">
            <ArrowLeft className="size-3.5" />
            <span>Back to Customers</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          disabled={loading}
          className="text-xs h-8 min-h-[36px]"
        >
          {loading ? (
            <Loader2 className="size-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="size-3 mr-1" />
          )}
          Refresh Details
        </Button>
      </div>

      {actionMessage && (
        <div
          className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
            actionMessage.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* 1. Customer Information Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {customer.name || "Unnamed Customer"}
              </h1>
              {customer.is_super_admin && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30">
                  Super Admin
                </Badge>
              )}
              <Badge
                variant={isSuspended ? "destructive" : "outline"}
                className={`text-[10px] uppercase font-semibold ${
                  !isSuspended ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                }`}
              >
                {customer.status}
              </Badge>
              {customer.email_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="size-3" /> Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="size-3" /> Unverified Email
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{customer.email}</p>
          </div>

          {/* 5. Administrative Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {!customer.is_super_admin && (
              <>
                <Button
                  variant={isSuspended ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusChange(isSuspended ? "active" : "suspended")}
                  disabled={actionLoading}
                  className={`text-xs h-9 min-h-[36px] ${
                    !isSuspended ? "text-destructive border-destructive/30 hover:bg-destructive/10" : ""
                  }`}
                >
                  {actionLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  {isSuspended ? "Reactivate Account" : "Suspend Account"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendResetEmail}
                  disabled={resetLoading}
                  className="text-xs h-9 min-h-[36px]"
                >
                  {resetLoading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Send className="size-3.5 mr-1.5" />}
                  Send Password Reset
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 border-t border-border mt-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-muted-foreground block text-[11px]">User ID</span>
            <span className="font-mono text-foreground font-medium truncate block">{customer.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Auth Method</span>
            <span className="text-foreground font-medium uppercase font-mono">
              {customer.auth_provider === "google" ? "Google Social" : "Email OTP"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Registration Date</span>
            <span className="text-foreground font-medium">
              {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Last Login</span>
            <span className="text-foreground font-medium">
              {customer.last_login_at
                ? new Date(customer.last_login_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                : "Never"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Instagram Information & 3. Subscription Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Instagram Information */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Instagram className="size-4 text-primary-accent" />
                Instagram Information
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Connected Meta accounts (limit: 4 per customer workspace).
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold">
              {instagramAccounts.filter((a) => a.status === "connected").length} of 4 slots used
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {instagramAccounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                <Instagram className="size-6 mx-auto mb-1.5 opacity-40" />
                <p className="font-medium text-foreground">No accounts connected</p>
                <p className="text-[11px] mt-0.5">This customer has not connected any Instagram accounts.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {instagramAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
                        <Instagram className="size-3.5 text-primary-accent" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">@{acc.username}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {acc.instagramId || acc.id} • {acc.accountType || "BUSINESS"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-semibold ${
                          acc.status === "connected" ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                        }`}
                      >
                        {acc.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {acc.connectedAt ? new Date(acc.connectedAt).toLocaleDateString() : "Connected"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Information */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="size-4 text-primary-accent" />
                Subscription Information
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Customer billing plan, pricing, and active features.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
              {subscription?.status || "Active"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-2 text-xs space-y-3">
            <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground text-sm">{subscription?.plan || "Free Launch Plan"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Billing cycle: {subscription?.billingCycle || "Free"} • Price: {subscription?.price || "$0"}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                $0 / month
              </Badge>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Features Included:</p>
              <ul className="space-y-1.5 text-[11px]">
                {(subscription?.features || [
                  "Up to 4 Instagram accounts",
                  "Unlimited DM & comment automations",
                  "Verified phone lead qualification gate",
                  "Excel / Sheets export integration",
                ]).map((feat, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Automation Information */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-emerald-600" />
              Automation Workflows ({automations.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Comment-to-DM triggers configured by this customer.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-semibold">{customer.activeAutomations || 0} active</span>
            <span className="text-muted-foreground">• {customer.inactiveAutomations || 0} inactive</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {automations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              <Zap className="size-6 mx-auto mb-1.5 opacity-40" />
              <p className="font-medium text-foreground">No automations created yet</p>
              <p className="text-[11px] mt-0.5">This customer has not built any Instagram comment-to-DM workflows.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {automations.map((a) => (
                <div key={a.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{a.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] uppercase font-bold py-0 ${
                          a.status === "active" ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                        }`}
                      >
                        {a.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Trigger keyword: <span className="font-semibold text-foreground">{a.triggerKeyword}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                      Reply: &ldquo;{a.replyText}&rdquo;
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Loading customer details...</p>
        </div>
      }
    >
      <CustomerDetailContent />
    </React.Suspense>
  );
}
