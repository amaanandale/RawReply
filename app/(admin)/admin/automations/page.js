"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Zap, AlertCircle, RefreshCw, Loader2, Bot, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function AutomationsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [automations, setAutomations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadAutomations() {
      setLoading(true);
      setError(null);
      try {
        const url = statusFilter ? `/api/admin/automations?status=${statusFilter}` : "/api/admin/automations";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load automations.");
        const data = await res.json();
        if (!ignore) {
          setAutomations(data.automations || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadAutomations();

    return () => {
      ignore = true;
    };
  }, [statusFilter, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Platform Automations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor Instagram comment-to-DM automated sequences configured across customer workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[36px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs min-h-[36px]"
          >
            {loading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Automations Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary-accent" />
            Configured Automations ({automations.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Automations execute exclusively when an eligible Instagram comment triggers a requirement-gathering DM sequence.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Querying database for workflows...</span>
            </div>
          ) : automations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-primary-accent/10 p-3 text-primary-accent">
                <Bot className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No Workspace Automations Active
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Customer workspaces have not activated any automated comment-to-DM triggers matching the current filter.
              </p>
              <div className="pt-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  State: Zero Configured Automations
                </Badge>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {automations.map((a) => {
                const isActive = a.status === "active";
                return (
                  <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{a.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold py-0 ${
                            isActive ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" : ""
                          }`}
                        >
                          {a.status}
                        </Badge>
                        {a.organization_name && (
                          <span className="text-[10px] text-muted-foreground">
                            Workspace: {a.organization_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Trigger: <strong className="text-foreground">{a.trigger_keyword || a.triggerKeyword || "Any"}</strong> • Reply: &ldquo;{a.reply_text || a.replyText || "Automated response"}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-mono shrink-0">
                      <Calendar className="size-3" />
                      <span>{a.created_at ? new Date(a.created_at).toLocaleDateString() : "Active"}</span>
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

export default function AdminAutomationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mb-2" />
          <p className="text-sm">Loading automations...</p>
        </div>
      }
    >
      <AutomationsContent />
    </React.Suspense>
  );
}
