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
  Plus,
  Trash2,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminIntegrationsPage() {
  const [platformAccounts, setPlatformAccounts] = React.useState([]);
  const [customerAccounts, setCustomerAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadIntegrations() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/integrations");
        if (!res.ok) throw new Error("Failed to load integrations.");
        const data = await res.json();
        if (!ignore) {
          setPlatformAccounts(data.platformAccounts || []);
          setCustomerAccounts(data.customerAccounts || []);
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
    setRefreshIndex((prev) => prev + 1);
  };

  const handleDisconnect = async (organizationId, accountId, username) => {
    if (!confirm(`Are you sure you want to disconnect @${username}?`)) return;
    setActionLoading(accountId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/integrations?organizationId=${organizationId}&accountId=${accountId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect account.");
      setSuccessMsg(`Successfully disconnected @${username}.`);
      handleRefresh();
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
            Instagram Integrations & Platform Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage platform-owned operational accounts and monitor customer Instagram connections.
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

      {successMsg && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Security Banner */}
      <div className="rounded-lg border border-border bg-card p-3.5 text-xs text-muted-foreground flex items-center gap-3">
        <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
        <span>
          <strong>Zero-Exposure Security:</strong> All Meta OAuth Page and User Access Tokens are encrypted with AES-256-GCM at rest and strictly stripped from all administrative control plane views.
        </span>
      </div>

      {/* 1. Super Admin Platform Instagram Accounts */}
      <Card className="border border-primary-accent/30 bg-card shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Instagram className="size-4 text-primary-accent" />
                Platform-Owned Instagram Accounts
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30">
                Super Admin Account
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Platform accounts for system operations, health verification, and platform-level automations. Does NOT consume customer slots.
            </CardDescription>
          </div>

          <Button asChild size="sm" className="text-xs shrink-0 bg-primary-accent hover:bg-primary-accent/90 text-white min-h-[36px]">
            <a href="/api/auth/meta/authorize?scope=platform">
              <Plus className="size-3.5 mr-1.5" />
              Connect Platform Account
            </a>
          </Button>
        </CardHeader>

        <CardContent className="p-0 border-t border-border">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary-accent mb-1" />
              <span>Scanning platform accounts...</span>
            </div>
          ) : platformAccounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Instagram className="size-6 mx-auto mb-1.5 opacity-40 text-primary-accent" />
              <p className="font-semibold text-foreground">No Platform Instagram Accounts Connected</p>
              <p className="text-[11px] mt-0.5">Click &ldquo;Connect Platform Account&rdquo; above to link a Super Admin operational account.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {platformAccounts.map((account) => (
                <div key={account.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary-accent/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">@{account.username}</span>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary-accent border-primary-accent/40 bg-card">
                        Platform Account
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10 border-emerald-500/20 uppercase font-semibold">
                        {account.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      ID: {account.instagramAccountId} • Page: {account.pageName || account.pageId || "Platform Page"} • Connected: {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading === account.id}
                    onClick={() => handleDisconnect(account.organizationId, account.id, account.username)}
                    className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0 self-start sm:self-center"
                  >
                    {actionLoading === account.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Trash2 className="size-3 mr-1" />}
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Customer Instagram Integrations */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Instagram className="size-4 text-muted-foreground" />
            Customer Instagram Integrations ({customerAccounts.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Customer Business and Creator accounts connected via Meta OAuth (maximum 4 per workspace).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Scanning customer accounts...</span>
            </div>
          ) : customerAccounts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-primary-accent/10 p-3 text-primary-accent">
                <Instagram className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No Customer Accounts Connected
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                When customers connect their Instagram accounts from their dashboard, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customerAccounts.map((account) => {
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
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading === account.id}
                      onClick={() => handleDisconnect(account.organizationId, account.id, account.username)}
                      className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0 self-start lg:self-center"
                    >
                      {actionLoading === account.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <Trash2 className="size-3 mr-1" />}
                      Disconnect
                    </Button>
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
