"use client";

import * as React from "react";
import {
  Building2,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);

  const fetchOrganizations = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/organizations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load organizations.");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganizations();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOrganizations]);

  const handleStatusChange = async (organizationId, targetStatus) => {
    setActionLoading(organizationId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/organizations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          status: targetStatus,
          reason: `Admin changed status to ${targetStatus}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update organization status.");

      setSuccessMsg(`Organization status updated to ${targetStatus}.`);
      await fetchOrganizations();
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
            Organization Workspaces
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor tenant workspaces, member allocations, and workspace standing.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrganizations}
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
            placeholder="Search by workspace name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter organizations by status"
            className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Organizations List */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="size-4 text-primary-accent" />
            Organizations ({organizations.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Multi-tenant workspaces provisioned on RawReply.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && organizations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Loading organizations...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No organizations found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {organizations.map((org) => {
                const isSuspended = org.status === "suspended";

                return (
                  <div
                    key={org.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {org.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ({org.slug})
                        </span>
                        <Badge
                          variant={isSuspended ? "destructive" : "outline"}
                          className={`text-[10px] uppercase font-semibold py-0 ${
                            !isSuspended ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                          }`}
                        >
                          {org.status || "active"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="size-3 text-muted-foreground" />
                          {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                        </span>
                        {org.owner && (
                          <span>
                            Owner: <span className="font-medium text-foreground">{org.owner.name}</span> ({org.owner.email})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isSuspended ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === org.id}
                          onClick={() => handleStatusChange(org.id, "active")}
                          className="text-xs h-8 text-emerald-700 border-emerald-500/30 hover:bg-emerald-50 min-h-[44px] sm:min-h-[32px]"
                        >
                          {actionLoading === org.id ? (
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
                          disabled={actionLoading === org.id}
                          onClick={() => handleStatusChange(org.id, "suspended")}
                          className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[44px] sm:min-h-[32px]"
                        >
                          {actionLoading === org.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <XCircle className="size-3.5 mr-1" />
                          )}
                          Suspend
                        </Button>
                      )}
                    </div>
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

