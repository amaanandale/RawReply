"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
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
            Instagram Integrations Monitoring
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Database-backed Instagram Professional accounts linked via Meta Unified Login.
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
            Real Instagram Business and Creator profiles active on RawReply.
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
              {integrations.map((account) => {
                const isConnected = account.status === "connected";

                return (
                  <div
                    key={account.id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground">
                          @{account.username || account.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold py-0 uppercase ${
                            isConnected
                              ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
                              : "text-destructive border-destructive/20"
                          }`}
                        >
                          {account.status || "connected"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono py-0">
                          {account.accountType || "BUSINESS"}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ID: {account.instagramAccountId}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" />
                          <span>Customer: </span>
                          {account.customerId ? (
                            <Link
                              href={`/admin/customers/${account.customerId}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {account.customerName}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">{account.customerName}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Building className="size-3 text-muted-foreground" />
                          <span>Workspace: </span>
                          <strong className="text-foreground font-medium">{account.organizationName}</strong>
                        </div>

                        <div>
                          <span>Linked Page: </span>
                          <strong className="text-foreground font-medium">{account.pageName || account.pageId || "Default Page"}</strong>
                        </div>
                      </div>

                      {/* Technical & Token Expiration Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Connected: {new Date(account.connectedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Token Status:{" "}
                          <span className="font-medium text-foreground">
                            {account.tokenExpiresAt
                              ? `Expires ${new Date(account.tokenExpiresAt).toLocaleDateString()}`
                              : "60-Day Long-Lived Token"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="size-3" />
                          Last Activity:{" "}
                          <span className="font-medium text-foreground">
                            {account.lastActivityAt
                              ? new Date(account.lastActivityAt).toLocaleDateString()
                              : "Active"}
                          </span>
                        </span>
                      </div>

                      {/* Error or Webhook Status */}
                      {account.lastError ? (
                        <div className="text-[11px] text-destructive flex items-center gap-1 pt-1">
                          <AlertTriangle className="size-3 shrink-0" />
                          <span>Last API Error: {account.lastError}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-600 flex items-center gap-1 pt-1">
                          <CheckCircle2 className="size-3 shrink-0" />
                          <span>Webhooks Verified (Subscribed to Feed & Messaging)</span>
                        </div>
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
