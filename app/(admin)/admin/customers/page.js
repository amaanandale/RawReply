"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Building,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Mail,
  Zap,
  CreditCard,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Send,
} from "lucide-react";
import { Instagram, Google } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function CustomerDetailsModal({ customerId, onClose, onStatusUpdated }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadDetails() {
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        if (!res.ok) throw new Error("Failed to load customer profile details.");
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

    loadDetails();

    return () => {
      ignore = true;
    };
  }, [customerId, refreshKey]);

  const handleStatusToggle = async () => {
    if (!data?.customer) return;
    const targetStatus = data.customer.status === "suspended" ? "active" : "suspended";
    setActionLoading(true);
    setMsg(null);
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
      if (!res.ok) throw new Error(resData.error || "Failed to update account status.");
      setMsg({ type: "success", text: `Account successfully ${targetStatus === "active" ? "reactivated" : "suspended"}.` });
      setRefreshKey((k) => k + 1);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!data?.customer?.email) return;
    setResetLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.customer.email }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to initiate password reset.");
      setMsg({ type: "success", text: `Password reset verification email sent to ${data.customer.email}.` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  const customer = data?.customer;
  const instagramAccounts = data?.instagramAccounts || [];
  const subscription = data?.subscription;
  const automations = data?.automations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span>{customer?.name || "Customer Profile"}</span>
              {customer?.is_super_admin && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30">
                  Super Admin
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{customer?.email || "Loading..."}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin text-primary-accent" />
              <span>Loading complete customer details from database...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {msg && (
                <div
                  className={`rounded-lg border p-3 flex items-center gap-2 ${
                    msg.type === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {msg.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0" />
                  )}
                  <span>{msg.text}</span>
                </div>
              )}

              {/* 1. Customer Information */}
              <div className="space-y-2.5">
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  1. Customer Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Full Name</span>
                    <span className="font-semibold text-foreground">{customer?.name || "Unnamed"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">User ID</span>
                    <span className="font-mono text-foreground truncate block">{customer?.id}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Auth Method</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold mt-0.5">
                      {customer?.auth_provider === "google" ? "Google Social" : "Email OTP"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Account Status</span>
                    <Badge
                      variant={customer?.status === "suspended" ? "destructive" : "outline"}
                      className={`text-[10px] uppercase font-bold mt-0.5 ${
                        customer?.status !== "suspended" ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                      }`}
                    >
                      {customer?.status || "active"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Email Verification</span>
                    <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                      {customer?.email_verified ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Clock className="size-3" /> Pending
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Registration Date</span>
                    <span className="font-medium text-foreground">
                      {customer?.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Last Login Date</span>
                    <span className="font-medium text-foreground">
                      {customer?.last_login_at ? new Date(customer.last_login_at).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Lead Records</span>
                    <span className="font-semibold text-emerald-600">{customer?.totalLeads || 0} qualified</span>
                  </div>
                </div>
              </div>

              {/* 2. Instagram Information */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                    2. Instagram Information
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-medium">
                    {instagramAccounts.filter((a) => a.status === "connected").length} of 4 slots used
                  </Badge>
                </div>

                {instagramAccounts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                    <Instagram className="size-6 mx-auto mb-1.5 opacity-40" />
                    <p className="font-medium text-foreground">No Instagram accounts connected</p>
                    <p className="text-[11px] mt-0.5">This customer has not connected any Instagram Business/Creator accounts yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {instagramAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary-accent/10 flex items-center justify-center shrink-0">
                            <Instagram className="size-4 text-primary-accent" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">@{acc.username}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Account ID: {acc.instagramId || acc.id} • Type: {acc.accountType || "BUSINESS"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold ${
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
              </div>

              {/* 3. Subscription Information */}
              <div className="space-y-2.5">
                <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  3. Subscription Information
                </h3>
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-sm text-foreground">{subscription?.plan || "Free Launch Plan"}</span>
                      <span className="text-muted-foreground ml-2">({subscription?.price || "$0"} • {subscription?.billingCycle || "Free"})</span>
                    </div>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-500/10 border-emerald-500/20 text-[10px] uppercase font-bold">
                      {subscription?.status || "Active"}
                    </Badge>
                  </div>
                  <div className="border-t border-border/60 pt-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Features Included:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {(subscription?.features || [
                        "Up to 4 Instagram accounts",
                        "Unlimited automations",
                        "Verified phone lead qualification gate",
                      ]).map((feat, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-foreground">
                          <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 4. Automation Information */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                    4. Automation Information
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      {customer?.activeAutomations ?? 0} active
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      / {customer?.totalAutomations ?? 0} total
                    </span>
                  </div>
                </div>

                {automations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                    <Zap className="size-6 mx-auto mb-1.5 opacity-40" />
                    <p className="font-medium text-foreground">No automations created yet</p>
                    <p className="text-[11px] mt-0.5">This customer has not built any Instagram comment-to-DM workflows.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {automations.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-lg border border-border bg-card flex items-start justify-between gap-3 text-xs"
                      >
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
                            Trigger: <span className="font-semibold text-foreground">{a.triggerKeyword}</span> • Reply: <span className="italic">{a.replyText?.substring(0, 45)}...</span>
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / 5. Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {!customer?.is_super_admin && (
              <>
                <Button
                  variant={customer?.status === "suspended" ? "default" : "outline"}
                  size="sm"
                  onClick={handleStatusToggle}
                  disabled={actionLoading || loading}
                  className={`text-xs h-8 ${customer?.status !== "suspended" ? "text-destructive border-destructive/30 hover:bg-destructive/10" : ""}`}
                >
                  {actionLoading && <Loader2 className="size-3 mr-1 animate-spin" />}
                  {customer?.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendResetEmail}
                  disabled={resetLoading || loading}
                  className="text-xs h-8"
                >
                  {resetLoading ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Send className="size-3 mr-1" />}
                  Send Password Reset
                </Button>
              </>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Close Modal
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "";
  const initialStatus = searchParams.get("status") || "";

  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [customFilter, setCustomFilter] = React.useState(initialFilter);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (customFilter) params.set("filter", customFilter);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load customers.");
      const data = await res.json();
      setCustomers(data.customers || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, customFilter, page]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleStatusChange = async (userId, targetStatus, e) => {
    if (e) e.stopPropagation();
    setActionLoading(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/customers/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          status: targetStatus,
          reason: `Admin changed status to ${targetStatus}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setSuccessMsg(`Customer status updated to ${targetStatus}.`);
      await fetchCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Customer Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered customer accounts, Instagram slot consumption, authentication methods, and subscription health.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCustomers}
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

      {successMsg && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Quick Filter */}
          <select
            value={customFilter}
            onChange={(e) => {
              setCustomFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter customers by authentication or integration"
            className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          >
            <option value="">All Customers</option>
            <option value="email_otp">Auth: Email OTP</option>
            <option value="google">Auth: Google Social</option>
            <option value="verified">Verified Email Only</option>
            <option value="instagram">With Instagram Connected</option>
            <option value="no_instagram">No Instagram Connected</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter customers by account status"
            className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          >
            <option value="">All Standing</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Customers Table Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary-accent" />
              Customer Accounts ({totalCount})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Click any customer row to inspect their detailed modal with Instagram connections, automations, and subscription status.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Querying database for customers...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No customers found matching the specified filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3 pl-4">Customer</th>
                    <th className="p-3">Auth Method</th>
                    <th className="p-3">Email Status</th>
                    <th className="p-3">Instagram Slots</th>
                    <th className="p-3">Subscription</th>
                    <th className="p-3">Registered</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => {
                    const isSuperAdmin = Boolean(c.is_super_admin);
                    const isSuspended = c.status === "suspended";
                    const isGoogle = c.auth_provider === "google";
                    const igCount = c.instagram_accounts_count || 0;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        {/* Customer Name & Email */}
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-foreground group-hover:text-primary-accent transition-colors">
                            {c.name || "Unnamed"}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                            {c.email}
                          </div>
                        </td>

                        {/* Authentication Method */}
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {isGoogle ? "Google" : "Email OTP"}
                          </Badge>
                        </td>

                        {/* Email Verification Status */}
                        <td className="p-3">
                          {c.email_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <CheckCircle2 className="size-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                              <Clock className="size-3" /> Pending
                            </span>
                          )}
                        </td>

                        {/* Instagram Connection Count (X of 4) */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Instagram className="size-3.5 text-muted-foreground" />
                            <span className={`font-semibold ${igCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                              {igCount} of 4
                            </span>
                          </div>
                        </td>

                        {/* Subscription Status */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Free Launch Plan
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                        </td>

                        {/* Account Status */}
                        <td className="p-3">
                          <Badge
                            variant={isSuspended ? "destructive" : "outline"}
                            className={`text-[10px] uppercase font-bold py-0 ${
                              !isSuspended ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                            }`}
                          >
                            {c.status || "active"}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="p-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCustomerId(c.id)}
                              className="text-xs h-7 px-2"
                            >
                              View Details
                            </Button>

                            {!isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === c.id}
                                onClick={(e) => handleStatusChange(c.id, isSuspended ? "active" : "suspended", e)}
                                className={`text-[11px] h-7 px-2 ${
                                  isSuspended
                                    ? "text-emerald-700 border-emerald-500/30 hover:bg-emerald-50"
                                    : "text-destructive border-destructive/30 hover:bg-destructive/10"
                                }`}
                              >
                                {actionLoading === c.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : isSuspended ? (
                                  "Reactivate"
                                ) : (
                                  "Suspend"
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({totalCount} total customers)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 text-xs"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 text-xs"
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Interactive Customer Detail Modal */}
      {selectedCustomerId && (
        <CustomerDetailsModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onStatusUpdated={fetchCustomers}
        />
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Loading customer management...</p>
        </div>
      }
    >
      <CustomersContent />
    </React.Suspense>
  );
}
