"use client";

import * as React from "react";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminActivityPage() {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [selectedAction, setSelectedAction] = React.useState("");
  const [error, setError] = React.useState(null);
  const [expandedLog, setExpandedLog] = React.useState(null);

  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadLogs() {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (selectedAction) params.set("action", selectedAction);

        const res = await fetch(`/api/admin/activity?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load audit logs.");
        const data = await res.json();

        if (!ignore) {
          setLogs(data.logs || []);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalCount(data.pagination.total);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      ignore = true;
    };
  }, [page, selectedAction, refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            System Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all administrative actions, customer status transitions, and security events.
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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value);
            setPage(1);
          }}
          aria-label="Filter audit logs by action"
          className="rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[38px]"
        >
          <option value="">All Administrative Actions</option>
          <option value="super_admin_created">super_admin_created</option>
          <option value="super_admin_promoted">super_admin_promoted</option>
          <option value="customer_suspended">customer_suspended</option>
          <option value="customer_reactivated">customer_reactivated</option>
          <option value="organization_suspended">organization_suspended</option>
          <option value="organization_reactivated">organization_reactivated</option>
          <option value="super_admin_password_updated">super_admin_password_updated</option>
        </select>
      </div>

      {/* Logs Table */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4 text-primary-accent" />
              Recorded Audit Events ({totalCount})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Cryptographically verified audit trail records.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Page {page} of {totalPages}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Querying audit records...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No audit logs recorded for this criteria.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log, index) => {
                const itemKey = log.id || `act-${log.created_at || index}-${index}`;
                const isExpanded = expandedLog === itemKey || (log.id && expandedLog === log.id);
                let detailsObj = null;
                try {
                  detailsObj = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
                } catch {
                  detailsObj = log.details;
                }

                return (
                  <div key={itemKey} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground font-mono">
                            {log.action}
                          </span>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono py-0">
                            {log.target_type || "system"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Actor: <span className="font-mono">{log.performed_by || "system"}</span>
                          {log.target_id && (
                            <> &rarr; Target: <span className="font-mono">{log.target_id}</span></>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedLog(isExpanded ? null : itemKey)}
                          className="text-[11px] h-7 px-2 min-h-[44px] sm:min-h-[28px]"
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && detailsObj && (
                      <div className="mt-3 rounded border border-border bg-muted/40 p-3 text-[11px] font-mono text-foreground overflow-x-auto">
                        <pre>{JSON.stringify(detailsObj, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs h-8 min-h-[44px] sm:min-h-[32px]"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs h-8 min-h-[44px] sm:min-h-[32px]"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
