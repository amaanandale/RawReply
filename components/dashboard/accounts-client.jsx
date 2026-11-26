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
  HelpCircle,
  X,
  Smartphone,
  ArrowRight,
  Sparkles,
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
  const [isVerifyingWebhooks, setIsVerifyingWebhooks] = React.useState(null);
  const [actionMessage, setActionMessage] = React.useState(null);
  const [selectedFilter, setSelectedFilter] = React.useState("all");
  const popupRef = React.useRef(null);

  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");
  const usernameParam = searchParams.get("username");
  const platformParam = searchParams.get("platform");
  const messageParam = searchParams.get("message");
  const pageNameParam = searchParams.get("page_name");

  const isNoBusinessAccountError = errorParam === "no_instagram_business_account";
  const [showProfessionalGuide, setShowProfessionalGuide] = React.useState(isNoBusinessAccountError);

  async function handleVerifyWebhooks(accountId) {
    setIsVerifyingWebhooks(accountId);
    try {
      const res = await fetch("/api/accounts/subscribe-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify webhooks");
      setActionMessage({
        type: "success",
        text: "Webhooks successfully subscribed and verified with Meta Graph API!",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: `Webhook verification note: ${err.message}`,
      });
    } finally {
      setIsVerifyingWebhooks(null);
    }
  }

  // Clean Meta's legacy #_=_ fragment from URL if present
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#_=_") {
      window.history.replaceState(null, "", window.location.href.split("#")[0]);
    }
  }, []);

  // Listen for postMessage from popup OAuth window
  React.useEffect(() => {
    function handleOAuthMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "META_OAUTH_COMPLETE") return;

      if (event.data.success) {
        setActionMessage({
          type: "success",
          text: `${event.data.platform === "facebook" ? "Facebook Page" : "Instagram Account"} connected successfully${event.data.username ? ` — ${event.data.platform === "facebook" ? event.data.username : `@${event.data.username}`}` : ""}!`,
        });
        // Refresh accounts list
        fetch("/api/accounts")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.accounts) setAccounts(data.accounts); })
          .catch(() => {});
        router.refresh();
      } else {
        setActionMessage({
          type: "error",
          text: event.data.error || "Failed to connect account. Please try again.",
        });
      }
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [router]);

  // Open OAuth in a popup window
  function handleConnectPopup(platform = "instagram") {
    const url = `/api/auth/meta/authorize?platform=${platform}&popup=1`;
    const popup = window.open(url, "rawreply_oauth", "width=600,height=720,left=200,top=100,toolbar=no,menubar=no");
    popupRef.current = popup;

    // Fallback: poll for popup close (if postMessage fails)
    const pollTimer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(pollTimer);
        popupRef.current = null;
        // Refresh accounts after popup closes as fallback
        fetch("/api/accounts")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.accounts) setAccounts(data.accounts); })
          .catch(() => {});
        router.refresh();
      }
    }, 500);
  }

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

      {/* Dedicated Instagram Professional Guidance Card */}
      {showProfessionalGuide && (
        <Card className="border-amber-300/80 bg-gradient-to-br from-amber-50/80 via-background to-orange-50/40 dark:from-amber-950/25 dark:via-background dark:to-orange-950/20 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-amber-200/50 dark:border-amber-900/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs">
                  <Instagram className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100/70 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] uppercase font-bold tracking-wider"
                    >
                      {isNoBusinessAccountError ? "Action Required" : "Setup Guide"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">Meta Graph API v21.0</span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mt-0.5">
                    Switch Your Instagram Account to Professional
                  </CardTitle>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfessionalGuide(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Dismiss guide"
              >
                <X className="size-4" />
              </button>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Meta&apos;s official Graph API requires your Instagram account to be set to <strong className="text-foreground font-semibold">Professional (Creator or Business)</strong> and linked to a Facebook Page to automate comments, send instant direct message replies, and capture qualified leads. Personal accounts are restricted by Meta.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 pb-4 space-y-4">
            {pageNameParam && (
              <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-300">
                <Facebook className="size-4 shrink-0 text-[#1877F2]" />
                <div>
                  <span className="font-semibold text-blue-950 dark:text-blue-200">
                    Facebook Page Detected: &quot;{pageNameParam}&quot;
                  </span>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300/80 mt-0.5">
                    Great news! You already have this Facebook Page. You just need to link your Instagram account to it in the Instagram mobile app.
                  </p>
                </div>
              </div>
            )}

            {/* 3 Numbered Steps */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-accent/15 text-primary-accent text-xs font-bold">
                    1
                  </span>
                  <h4 className="text-xs font-semibold text-foreground">Switch on Instagram App</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Open the Instagram app on your phone. Go to your <strong className="text-foreground">Profile</strong> → tap <strong className="text-foreground">Edit profile</strong> (or ☰ Settings) → scroll down and tap <strong className="text-foreground">Switch to professional account</strong> (choose Creator or Business — both are 100% free and keep all your posts).
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-accent/15 text-primary-accent text-xs font-bold">
                    2
                  </span>
                  <h4 className="text-xs font-semibold text-foreground">Connect Facebook Page</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  In Instagram, tap <strong className="text-foreground">Edit profile</strong> → under <strong className="text-foreground">Public business information</strong>, tap <strong className="text-foreground">Page</strong> → select your Facebook Page {pageNameParam ? `("${pageNameParam}")` : ""} or create a free one instantly.
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary-accent/15 text-primary-accent text-xs font-bold">
                    3
                  </span>
                  <h4 className="text-xs font-semibold text-foreground">Reconnect with RawReply</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Once switched and linked, click the reconnect button below. Meta will automatically identify your Professional account and finish the connection!
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border/70 bg-muted/30 pt-3 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-xs"
                onClick={() => handleConnectPopup("instagram")}
              >
                <Instagram className="size-4 mr-1.5" />
                I&apos;ve Switched to Professional — Reconnect Instagram
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleConnectPopup("facebook")}
              >
                <Facebook className="size-3.5 mr-1.5 text-[#1877F2]" />
                Connect Facebook Page Instead
              </Button>
            </div>

            <a
              href="https://help.instagram.com/502981923235522"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              <span>Instagram Official Guide</span>
              <ExternalLink className="size-3 ml-1" />
            </a>
          </CardFooter>
        </Card>
      )}

      {/* Other OAuth Callback Errors */}
      {errorParam && !isNoBusinessAccountError && (
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

      {/* Account Limit Capacity Bar & Platform Actions (Shown only when accounts exist) */}
      {accounts.length > 0 && (
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
                <div className="flex items-center gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowProfessionalGuide((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary-accent hover:text-primary-accent/80 transition-colors font-medium underline-offset-4 hover:underline"
                  >
                    <HelpCircle className="size-3.5" />
                    <span>{showProfessionalGuide ? "Hide Setup Guide" : "Need help? View Professional Account Guide"}</span>
                  </button>
                </div>
              </div>

              {/* Single Unified Connection Button */}
              <div className="flex flex-wrap items-center gap-2.5">
                {isLimitReached ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 font-medium">
                    Slot Limit Reached (4/4) — Disconnect an account to add another
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      size="sm"
                      className="min-h-[40px] sm:min-h-[36px] bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:from-[#e08323] hover:via-[#c91e35] hover:to-[#a51578] text-white font-semibold shadow-xs"
                      onClick={() => handleConnectPopup("instagram")}
                    >
                      <Instagram className="size-4 mr-1.5" />
                      Continue with Instagram
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[40px] sm:min-h-[36px] font-semibold text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/5"
                      onClick={() => handleConnectPopup("facebook")}
                    >
                      <Facebook className="size-4 mr-1.5 text-[#1877F2]" />
                      Continue with Facebook
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

                <CardFooter className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleVerifyWebhooks(acc.id)}
                      disabled={isVerifyingWebhooks === acc.id}
                      className="text-xs"
                    >
                      <RefreshCw className={`size-3 mr-1 ${isVerifyingWebhooks === acc.id ? "animate-spin" : ""}`} />
                      {isVerifyingWebhooks === acc.id ? "Verifying..." : "Verify Webhooks"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => handleConnectPopup(isFb ? "facebook" : "instagram")}
                    >
                      <RefreshCw className="size-3 mr-1" /> Reconnect
                    </Button>
                  </div>
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
        /* Zero Accounts Empty State: Dual Login Popup Buttons */
        <Card className="border-dashed border-border bg-card/60 p-8 flex flex-col justify-between text-center items-center max-w-md mx-auto">
          <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs mb-3">
            <Instagram className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Connect Instagram Professional</h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs">
            Link your Instagram Business or Creator account via Meta Unified Login to listen to post and Reel comments, send automated replies, and capture qualified leads.
          </p>
          <div className="mt-5 w-full flex flex-col items-center gap-2.5">
            <Button
              size="sm"
              className="w-full font-semibold bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:from-[#e08323] hover:via-[#c91e35] hover:to-[#a51578] text-white shadow-xs"
              onClick={() => handleConnectPopup("instagram")}
            >
              <Instagram className="size-4 mr-1.5" />
              Continue with Instagram
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full font-semibold text-[#1877F2] border-[#1877F2]/30 hover:bg-[#1877F2]/5"
              onClick={() => handleConnectPopup("facebook")}
            >
              <Facebook className="size-4 mr-1.5 text-[#1877F2]" />
              Continue with Facebook
            </Button>
            <button
              type="button"
              onClick={() => setShowProfessionalGuide(true)}
              className="mt-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Requires a free Professional account (view guide)
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
