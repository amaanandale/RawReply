"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Loader2, ShieldCheck, Building } from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadIntegrations() {
      try {
        const res = await fetch("/api/admin/integrations");
        if (!res.ok) throw new Error("Failed to load integrations.");
        const data = await res.json();
        if (!ignore) {
          setIntegrations(data.integrations || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadIntegrations();

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
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Instagram Integrations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real Instagram Business and Creator accounts linked to tenant workspaces via Meta Graph API.
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
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Banner */}
      <div className="rounded-lg border border-border bg-card p-3.5 text-xs text-muted-foreground flex items-center gap-3">
        <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Zero-Exposure Security:</strong> All Meta OAuth Page and User Access Tokens are encrypted with AES-256-GCM at rest and are strictly stripped from all administrative responses and control plane views.
        </span>
      </div>

      {/* Integrations List */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Instagram className="size-4 text-primary-accent" />
            Connected Instagram Accounts ({integrations.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Live integrations receiving comment and messaging webhook events.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Scanning connected accounts...</span>
            </div>
          ) : integrations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-primary-accent/10 p-3 text-primary-accent">
                <Instagram className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No Instagram Accounts Connected
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                No customer workspaces have completed the Instagram OAuth flow yet. When an account is connected from the Customer Dashboard, its metadata will register here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {integrations.map((account) => (
                <div
                  key={account.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        @{account.username || account.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10 border-emerald-500/20 py-0">
                        {account.status || "connected"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono py-0">
                        {account.accountType || "BUSINESS"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Building className="size-3 text-muted-foreground" />
                        Workspace: <strong className="text-foreground font-medium">{account.organizationName}</strong>
                      </span>
                      <span>Page: {account.pageName || account.pageId || "Default"}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground shrink-0 font-mono self-end sm:self-center">
                    Connected: {account.connectedAt ? new Date(account.connectedAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
