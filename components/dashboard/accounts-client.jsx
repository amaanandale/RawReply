"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AccountsClient({ initialAccounts, isConfigured = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = React.useState(initialAccounts || []);
  const [isDisconnecting, setIsDisconnecting] = React.useState(null);
  const [actionMessage, setActionMessage] = React.useState(null);

  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");
  const usernameParam = searchParams.get("username");
  const messageParam = searchParams.get("message");

  async function handleDisconnect(accountId, username) {
    if (!confirm(`Are you sure you want to disconnect @${username}? Future comment automations for this account will stop.`)) {
      return;
    }

    setIsDisconnecting(accountId);
    try {
      const res = await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId: accountId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disconnect account");
      }

      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      setActionMessage({
        type: "success",
        text: `@${username} has been disconnected.`,
      });
      router.refresh();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.message,
      });
    } finally {
      setIsDisconnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration Advisory Banner */}
      {!isConfigured && (
        <div className="flex flex-col sm:flex-row items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-xs">
          <ShieldAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="font-semibold text-amber-950 text-sm">
              Meta Application Credentials Required
            </p>
            <p className="text-amber-800 leading-relaxed">
              To connect your real Instagram Business or Creator account, add your Meta Developer credentials to <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-950">.env.local</code>:
            </p>
            <div className="rounded bg-amber-100/70 p-2.5 font-mono text-[11px] text-amber-950 border border-amber-200/60 overflow-x-auto space-y-0.5">
              <div>META_APP_ID=your_facebook_app_id</div>
              <div>META_APP_SECRET=your_facebook_app_secret</div>
              <div>META_REDIRECT_URI=http://localhost:3000/api/auth/meta/callback</div>
            </div>
            <p className="text-[11px] text-amber-700">
              Valid OAuth Redirect URI to register in Meta App Dashboard: <code className="font-mono font-semibold">http://localhost:3000/api/auth/meta/callback</code>
            </p>
          </div>
        </div>
      )}

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-xs ${
            actionMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* OAuth Callback Alerts */}
      {successParam === "connected" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">
              Instagram Account Connected!
            </p>
            <p className="mt-0.5 text-emerald-700">
              {usernameParam ? `@${usernameParam}` : "Your account"} has been successfully linked and webhooks subscribed.
            </p>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              {errorParam === "missing_configuration"
                ? "Configuration Missing"
                : errorParam === "forbidden"
                ? "Access Denied"
                : "Connection Failed"}
            </p>
            <p className="mt-0.5 text-red-700">
              {messageParam || "An error occurred during Meta authorization."}
            </p>
          </div>
        </div>
      )}

      {/* Connected Accounts Section */}
      {accounts.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Connected Professional Accounts ({accounts.length})
            </h2>
            <Button size="sm" asChild className="h-9 px-3">
              <a href="/api/auth/meta/authorize">
                <Plus className="size-4 mr-1.5" />
                Connect Another Account
              </a>
            </Button>
          </div>

          {/* Mobile-First Stacked Account Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((acc) => (
              <Card key={acc.id} className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {acc.profilePictureUrl ? (
                        <Image
                          src={acc.profilePictureUrl}
                          alt={acc.username}
                          width={44}
                          height={44}
                          className="size-11 rounded-full border border-border object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-full bg-primary-accent-light text-primary-accent border border-primary-accent/20">
                          <Instagram className="size-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-foreground">
                            @{acc.username}
                          </h3>
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {acc.accountType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acc.name || "Instagram Business"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={acc.status} label="Active" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-xs border-t border-border pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Facebook Page</span>
                    <span className="font-medium text-foreground">{acc.pageName || acc.pageId}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Webhook Status</span>
                    <span className="font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Subscribed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Connected On</span>
                    <span className="font-mono text-[11px] text-foreground">
                      {new Date(acc.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="xs"
                    asChild
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <a href="/api/auth/meta/authorize">
                      <RefreshCw className="size-3 mr-1" /> Reconnect
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleDisconnect(acc.id, acc.username)}
                    disabled={isDisconnecting === acc.id}
                    className="text-xs"
                  >
                    <Trash2 className="size-3 mr-1" />
                    {isDisconnecting === acc.id ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 mb-4 text-primary-accent border border-border">
            <Instagram className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No Instagram Accounts Connected
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Link your Instagram Professional account to activate post comment listening, interactive questionnaire DMs, and qualified lead capture.
          </p>
          <div className="mt-6">
            <Button size="lg" asChild className="h-11 px-6 font-semibold min-h-[44px]">
              <a href="/api/auth/meta/authorize">
                <Plus className="size-4 mr-2" />
                Connect Instagram Professional Account
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
