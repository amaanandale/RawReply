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
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  PhoneCall,
  Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.customerId;
  const router = useRouter();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState(null);

  const fetchDetails = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load customer details.");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    if (customerId) {
      fetchDetails();
    }
  }, [customerId, fetchDetails]);

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
      await fetchDetails();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setActionLoading(false);
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

  const { customer, organizations, loginHistory, errors, auditHistory } = data;
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
          onClick={fetchDetails}
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

      {/* Customer Header & Profile Card */}
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
              {customer.email_verified_at ? (
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

          {/* Administrative Actions */}
          <div className="flex items-center gap-2">
            {!customer.is_super_admin && (
              <Button
                variant={isSuspended ? "default" : "destructive"}
                size="sm"
                onClick={() => handleStatusChange(isSuspended ? "active" : "suspended")}
                disabled={actionLoading}
                className="text-xs h-9 min-h-[36px]"
              >
                {actionLoading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                {isSuspended ? "Reactivate Customer" : "Suspend Customer"}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 border-t border-border mt-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-muted-foreground block text-[11px]">Customer ID</span>
            <span className="font-mono text-foreground font-medium truncate block">{customer.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Registered Date</span>
            <span className="text-foreground font-medium">
              {new Date(customer.created_at).toLocaleDateString()}
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
          <div>
            <span className="text-muted-foreground block text-[11px]">Workspaces</span>
            <span className="text-foreground font-medium">{organizations.length} associated</span>
          </div>
        </CardContent>
      </Card>

      {/* Organization Details & Instagram Integrations */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Building2 className="size-4 text-primary-accent" />
          Workspace Organizations & Integrations ({organizations.length})
        </h2>

        {organizations.length === 0 ? (
          <Card className="border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No active workspace organizations associated with this customer.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <Card key={org.id} className="border border-border bg-card shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{org.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      Role: {org.role}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono text-muted-foreground">
                    Slug: {org.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Team Members</span>
                    <span className="font-semibold text-foreground">{org.memberCount} members</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Instagram Accounts</span>
                    <span className="font-semibold text-foreground">{org.accounts?.length || 0} connected</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Qualified Leads</span>
                    <span className="font-semibold text-emerald-600">{org.leadCount || 0} leads</span>
                  </div>

                  {/* Connected Accounts Details */}
                  {org.accounts && org.accounts.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">Active Instagram Accounts:</p>
                      {org.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between bg-muted/40 p-2 rounded border border-border text-[11px]"
                        >
                          <span className="font-bold text-foreground">@{acc.username}</span>
                          <span className="text-muted-foreground capitalize">{acc.accountType}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Login History & System Errors */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Login History */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4 text-primary-accent" />
              Recent Authentication History
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Last 10 login events and security checkpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {loginHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent login activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {loginHistory.map((evt) => (
                  <div key={evt.id} className="py-2 flex items-start justify-between text-xs">
                    <div>
                      <span
                        className={`font-semibold capitalize text-[11px] ${
                          evt.status === "success" ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {evt.event_type?.replace(/_/g, " ")}
                      </span>
                      {evt.safe_error_description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{evt.safe_error_description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(evt.created_at).toLocaleDateString()} {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Errors & Audit Events */}
        <Card className="border border-border bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-600" />
              Recent Issues & Audit Trail
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Administrative interventions and logged issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {auditHistory.length === 0 && errors.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No issues or audit interventions recorded.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {auditHistory.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2 text-xs">
                    <p className="font-semibold text-[11px] text-foreground capitalize">
                      {log.action?.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      By {log.actor_email} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {errors.slice(0, 5).map((err) => (
                  <div key={err.id} className="py-2 text-xs">
                    <p className="font-semibold text-[11px] text-destructive">
                      [{err.category}] {err.safe_message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Seen {err.occurrence_count || 1} time(s) • Last: {new Date(err.last_seen_at).toLocaleString()}
                    </p>
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

