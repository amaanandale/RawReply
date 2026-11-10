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
  Layers,
} from "lucide-react";
import { Instagram, Facebook } from "@/components/shared/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AccountsClient({ initialAccounts, isConfigured = true }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = React.useState(initialAccounts || []);
  const [isDisconnecting, setIsDisconnecting] = React.useState(null);
  const [actionMessage, setActionMessage] = React.useState(null);
  const [selectedFilter, setSelectedFilter] = React.useState("all");

  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");
  const usernameParam = searchParams.get("username");
  const platformParam = searchParams.get("platform");
  const messageParam = searchParams.get("message");

  const totalUsed = accounts.length;
  const isLimitReached = totalUsed >= 4;
  const remainingSlots = Math.max(0, 4 - totalUsed);

  const instagramCount = accounts.filter((a) => (a.platform || "instagram") === "instagram").length;
  const facebookCount = accounts.filter((a) => a.platform === "facebook").length;

  const filteredAccounts = accounts.filter((acc) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "instagram") return (acc.platform || "instagram") === "instagram";
    if (selectedFilter === "facebook") return acc.platform === "facebook";
    return true;
  });

  async function handleDisconnect(accountId, name, platform) {
    const platformLabel = platform === "facebook" ? "Facebook Page" : "Instagram Account";
    if (
      !confirm(
        `Are you sure you want to disconnect ${name}? Active automations listening to this ${platformLabel} will stop.`
      )
    ) {
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
        text: `${name} has been disconnected.`,
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
              To connect your real Instagram Professional accounts and Facebook Pages, configure your Meta Developer credentials in <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-950">.env.local</code>:
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
              {platformParam === "facebook" ? "Facebook Page" : "Instagram Account"} Connected!
            </p>
            <p className="mt-0.5 text-emerald-700">
              {usernameParam ? (platformParam === "facebook" ? usernameParam : `@${usernameParam}`) : "Your account"} has been successfully linked and webhooks subscribed.
            </p>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">
                {errorParam === "limit_reached"
                  ? "Account Limit Reached"
                  : errorParam === "missing_configuration"
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
        </div>
      )}

      {/* Account Limit Capacity Bar & Platform Actions */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Workspace Social Account Slots</span>
                <Badge
                  variant={isLimitReached ? "destructive" : "outline"}
                  className="text-xs font-mono font-semibold"
                >
                  {totalUsed} of 4 slots used ({remainingSlots} remaining)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Max 4 connected accounts across Instagram Professional and Facebook Pages combined ({instagramCount} Instagram, {facebookCount} Facebook).
              </p>
            </div>

            {/* Two Distinct Connection Options */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isLimitReached ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 font-medium">
                  Slot Limit Reached (4/4) — Disconnect an account to add another
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    asChild
                    variant="outline"
                    className="min-h-[40px] sm:min-h-[36px] border-primary-accent/40 hover:bg-primary-accent/5 hover:border-primary-accent text-foreground"
                  >
                    <a href="/api/auth/meta/authorize?platform=instagram">
                      <Instagram className="size-4 mr-2 text-primary-accent" />
                      Connect Instagram
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="min-h-[40px] sm:min-h-[36px] bg-[#1877F2] hover:bg-[#166FE5] text-white"
                  >
                    <a href="/api/auth/meta/authorize?platform=facebook">
                      <Facebook className="size-4 mr-2 text-white" />
                      Connect Facebook Page
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account List Header & Platform Filter Tabs */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedFilter === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => setSelectedFilter("instagram")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                selectedFilter === "instagram"
                  ? "bg-primary-accent text-white font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Instagram className="size-3" />
              Instagram ({instagramCount})
            </button>
            <button
              onClick={() => setSelectedFilter("facebook")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                selectedFilter === "facebook"
                  ? "bg-[#1877F2] text-white font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Facebook className="size-3" />
              Facebook Pages ({facebookCount})
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filteredAccounts.length} of {accounts.length} connected accounts
          </p>
        </div>
      )}

      {/* Connected Accounts Cards */}
      {filteredAccounts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredAccounts.map((acc) => {
            const isFb = acc.platform === "facebook";
            const displayName = isFb
              ? acc.pageName || acc.name || acc.username
              : `@${acc.username}`;
            const secondaryDetail = isFb
              ? `Page ID: ${acc.pageId || acc.id}`
              : `IG ID: ${acc.instagramBusinessId || acc.id}`;

            return (
              <Card key={acc.id} className="border-border bg-card shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {acc.profilePictureUrl ? (
                        <Image
                          src={acc.profilePictureUrl}
                          alt={displayName}
                          width={44}
                          height={44}
                          className="size-11 rounded-full border border-border object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className={`flex size-11 items-center justify-center rounded-full border ${
                            isFb
                              ? "bg-blue-50 text-[#1877F2] border-blue-200"
                              : "bg-primary-accent-light text-primary-accent border-primary-accent/20"
                          }`}
                        >
                          {isFb ? <Facebook className="size-6" /> : <Instagram className="size-6" />}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-foreground">
                            {displayName}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold ${
                              isFb
                                ? "border-blue-200 bg-blue-50/60 text-[#1877F2]"
                                : "border-pink-200 bg-pink-50/60 text-pink-700"
                            }`}
                          >
                            {isFb ? "Facebook Page" : "Instagram"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acc.name || (isFb ? "Facebook Business Page" : "Instagram Professional")}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={acc.status || "connected"} label="Active" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-xs border-t border-border pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Platform ID</span>
                    <span className="font-mono text-[11px] text-foreground">{secondaryDetail}</span>
                  </div>
                  {!isFb && acc.pageName && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Linked Facebook Page</span>
                      <span className="font-medium text-foreground">{acc.pageName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Webhook Status</span>
                    <span className="font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Subscribed & Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Connected On</span>
                    <span className="font-mono text-[11px] text-foreground">
                      {acc.connectedAt ? new Date(acc.connectedAt).toLocaleDateString() : "Active"}
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
                    <a
                      href={
                        isFb
                          ? "/api/auth/meta/authorize?platform=facebook"
                          : "/api/auth/meta/authorize?platform=instagram"
                      }
                    >
                      <RefreshCw className="size-3 mr-1" /> Reconnect
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => handleDisconnect(acc.id, displayName, acc.platform)}
                    disabled={isDisconnecting === acc.id}
                    className="text-xs"
                  >
                    <Trash2 className="size-3 mr-1" />
                    {isDisconnecting === acc.id ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : accounts.length > 0 ? (
        /* Filter returned empty */
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No {selectedFilter === "instagram" ? "Instagram accounts" : "Facebook Pages"} found matching this filter.
        </div>
      ) : (
        /* Zero Accounts Empty State */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Option A: Instagram Card */}
          <Card className="border-dashed border-border bg-card/60 p-6 flex flex-col justify-between text-center items-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-200 mb-3">
              <Instagram className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Connect Instagram Professional</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs">
              Link your Instagram Business or Creator account to listen to post and Reel comments, send automated replies, and capture qualified leads.
            </p>
            <div className="mt-5 w-full">
              <Button size="sm" asChild className="w-full font-semibold">
                <a href="/api/auth/meta/authorize?platform=instagram">
                  <Plus className="size-4 mr-1.5" />
                  Connect Instagram Account
                </a>
              </Button>
            </div>
          </Card>

          {/* Option B: Facebook Card */}
          <Card className="border-dashed border-border bg-card/60 p-6 flex flex-col justify-between text-center items-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-[#1877F2] border border-blue-200 mb-3">
              <Facebook className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Connect Facebook Page</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs">
              Connect your official Facebook Business Page to automatically reply to feed comments, initiate private Messenger replies, and qualify leads.
            </p>
            <div className="mt-5 w-full">
              <Button size="sm" asChild className="w-full font-semibold bg-[#1877F2] hover:bg-[#166FE5] text-white">
                <a href="/api/auth/meta/authorize?platform=facebook">
                  <Plus className="size-4 mr-1.5" />
                  Connect Facebook Page
                </a>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
