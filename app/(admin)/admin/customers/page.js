"use client";

import * as React from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
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
  }, [search, statusFilter, page]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
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
            View registered platform users, workspace memberships, and account standing.
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

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter customers by status"
            className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Customers List */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary-accent" />
              Registered Customers ({totalCount})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Click any customer row to view their complete profile, workspaces, integrations and activity.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && customers.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Loading customer records...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No customers found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customers.map((c) => {
                const isSuperAdmin = Boolean(c.is_super_admin);
                const isSuspended = c.status === "suspended";

                return (
                  <div
                    key={c.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <Link href={`/admin/customers/${c.id}`} className="space-y-1.5 flex-1 block">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary-accent transition-colors">
                          {c.name || "Unnamed User"}
                        </span>
                        {isSuperAdmin && (
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30 py-0">
                            Super Admin
                          </Badge>
                        )}
                        <Badge
                          variant={isSuspended ? "destructive" : "outline"}
                          className={`text-[10px] uppercase font-semibold py-0 ${
                            !isSuspended ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                          }`}
                        >
                          {c.status || "active"}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground font-mono">{c.email}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Joined: {new Date(c.created_at).toLocaleDateString()}
                        </span>
                        {c.last_login_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            Last login: {new Date(c.last_login_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Workspaces */}
                      {c.organizations && c.organizations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building className="size-3" />
                            Workspaces:
                          </span>
                          {c.organizations.map((org) => {
                            const roleDisplay = typeof org.role === "object" ? org.role?.name || "member" : String(org.role || "member");
                            return (
                              <span
                                key={org.id}
                                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                              >
                                {org.name} ({roleDisplay})
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                        <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-1">
                          <span>Details</span>
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>

                      {!isSuperAdmin && (
                        <>
                          {isSuspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === c.id}
                              onClick={(e) => handleStatusChange(c.id, "active", e)}
                              className="text-xs h-8 text-emerald-700 border-emerald-500/30 hover:bg-emerald-50 min-h-[36px]"
                            >
                              {actionLoading === c.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5 mr-1" />
                              )}
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === c.id}
                              onClick={(e) => handleStatusChange(c.id, "suspended", e)}
                              className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[36px]"
                            >
                              {actionLoading === c.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <AlertTriangle className="size-3.5 mr-1" />
                              )}
                              Suspend
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
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
    </div>
  );
}
