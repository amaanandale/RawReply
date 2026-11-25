"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Zap,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Heart,
  Video,
  ImageIcon,
  Sparkles,
  AlertCircle,
  Check,
  X,
  SlidersHorizontal,
  ChevronRight,
  Send,
} from "lucide-react";
import { Instagram, Facebook } from "@/components/shared/icons";
import { MetricCard } from "@/components/shared/metric-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function DashboardOverviewClient({ initialOverviewData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const successParam = searchParams.get("success");
  const usernameParam = searchParams.get("username");

  const [overview, setOverview] = React.useState(initialOverviewData);
  const [refreshing, setRefreshing] = React.useState(false);
  const [media, setMedia] = React.useState([]);
  const [mediaLoading, setMediaLoading] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(null);
  const [mediaFilter, setMediaFilter] = React.useState("all"); // 'all' | 'video' | 'image'
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [actionNotice, setActionNotice] = React.useState(
    successParam === "connected"
      ? {
          type: "success",
          text: `Instagram Account Connected! @${usernameParam || overview.primaryAccount?.username || "account"} has been successfully linked and webhooks subscribed.`,
        }
      : null
  );

  // Quick Automation Builder Modal State
  const [quickBuilderOpen, setQuickBuilderOpen] = React.useState(false);
  const [selectedPost, setSelectedPost] = React.useState(null);
  const [autoName, setAutoName] = React.useState("");
  const [triggerType, setTriggerType] = React.useState("any"); // 'any' | 'keyword'
  const [keywords, setKeywords] = React.useState("");
  const [publicReply, setPublicReply] = React.useState("Thanks for your comment! Check your direct messages.");
  const [dmMessage, setDmMessage] = React.useState("Hi! Thanks for reaching out. Please reply with your phone number to receive the full details.");
  const [savingAuto, setSavingAuto] = React.useState(false);
  const [autoSaveError, setAutoSaveError] = React.useState(null);
  const [autoSaveSuccess, setAutoSaveSuccess] = React.useState(null);

  const isConnected = Boolean(overview?.isConnected && overview?.primaryAccount);
  const primaryAccount = overview?.primaryAccount;
  const stats = overview?.stats || {
    qualifiedLeads: 0,
    activeAutomations: 0,
    connectedAccounts: 0,
    leadsToday: 0,
  };

  // Clean Meta's legacy #_=_ fragment from URL if present
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#_=_") {
      window.history.replaceState(null, "", window.location.href.split("#")[0]);
    }
  }, []);

  // Fetch updated overview data from backend
  const refreshOverview = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) {
        const json = await res.json();
        setOverview(json);
      }
    } catch (err) {
      console.error("[DashboardOverview] Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Always hydrate latest live data on mount and when arriving from OAuth redirect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      refreshOverview();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshOverview]);

  // Fetch Instagram posts & Reels when an account is connected
  const fetchMedia = React.useCallback(async (accountId, force = false) => {
    if (!accountId) return;
    setMediaLoading(true);
    setMediaError(null);
    try {
      const url = `/api/instagram/media?accountId=${encodeURIComponent(accountId)}&limit=18${force ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load Instagram media");
      }
      setMedia(json.media || []);
    } catch (err) {
      console.warn("[DashboardOverview] Media fetch note:", err.message);
      setMediaError(err.message);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Auto-fetch media when connected account is available
  React.useEffect(() => {
    if (primaryAccount?.id) {
      const timer = setTimeout(() => {
        fetchMedia(primaryAccount.id);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setMedia([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [primaryAccount?.id, fetchMedia]);

  // Handle Account Disconnect
  const handleDisconnect = async () => {
    if (!primaryAccount?.id) return;
    if (
      !confirm(
        `Are you sure you want to disconnect @${primaryAccount.username}? Active comment automations will stop listening.`
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId: primaryAccount.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect account");

      setActionNotice({
        type: "success",
        text: `@${primaryAccount.username} has been disconnected.`,
      });
      setMedia([]);
      await refreshOverview();
      router.refresh();
    } catch (err) {
      setActionNotice({ type: "error", text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Open Quick Automation Modal for a Post
  const handleOpenQuickBuilder = (item) => {
    setSelectedPost(item);
    setAutoName(`Trigger for ${item.mediaType === "VIDEO" ? "Reel" : "Post"}`);
    setTriggerType("any");
    setKeywords("");
    setAutoSaveError(null);
    setAutoSaveSuccess(null);
    setQuickBuilderOpen(true);
  };

  // Save Quick Automation
  const handleSaveAutomation = async (e) => {
    e.preventDefault();
    if (!selectedPost || !primaryAccount) return;

    setSavingAuto(true);
    setAutoSaveError(null);
    setAutoSaveSuccess(null);

    try {
      const payload = {
        name: autoName || `Automation for @${primaryAccount.username}`,
        platform: primaryAccount.platform || "instagram",
        accountId: primaryAccount.id,
        instagramAccountId: primaryAccount.id,
        postId: selectedPost.id,
        postCaption: selectedPost.caption || "",
        postThumbnailUrl: selectedPost.thumbnailUrl || selectedPost.mediaUrl,
        postPermalink: selectedPost.permalink,
        triggerType,
        triggerKeywords: keywords
          ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        keywordMatchType: "contains",
        publicReplyEnabled: Boolean(publicReply),
        publicReplyText: publicReply,
        dmEnabled: Boolean(dmMessage),
        dmMessageText: dmMessage,
      };

      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create automation");

      setAutoSaveSuccess("Automation published and active! Now listening for comments.");
      await refreshOverview();
      setTimeout(() => {
        setQuickBuilderOpen(false);
      }, 1500);
    } catch (err) {
      setAutoSaveError(err.message);
    } finally {
      setSavingAuto(false);
    }
  };

  // Filter media items
  const filteredMedia = media.filter((item) => {
    if (mediaFilter === "video") return item.mediaType === "VIDEO";
    if (mediaFilter === "image") return item.mediaType !== "VIDEO";
    return true;
  });

  const videoCount = media.filter((m) => m.mediaType === "VIDEO").length;
  const imageCount = media.filter((m) => m.mediaType !== "VIDEO").length;

  return (
    <div className="space-y-8">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-xs shadow-xs ${
            actionNotice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <span className="leading-relaxed font-medium">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 4 Core Real Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Qualified Leads"
          value={String(stats.qualifiedLeads)}
          description={
            stats.qualifiedLeads > 0
              ? `${stats.qualifiedLeads} verified phone submissions`
              : "No qualified leads yet"
          }
          icon={Users}
        />
        <MetricCard
          title="Active Automations"
          value={String(stats.activeAutomations)}
          description={
            stats.activeAutomations > 0
              ? `${stats.activeAutomations} active trigger workflows`
              : isConnected
              ? "Ready to create first trigger"
              : "Connect account to activate"
          }
          icon={Zap}
        />
        <MetricCard
          title="Connected Accounts"
          value={String(stats.connectedAccounts)}
          description={
            isConnected
              ? `@${primaryAccount.username} connected`
              : "No Instagram accounts connected"
          }
          icon={Instagram}
        />
        <MetricCard
          title="Leads Today"
          value={String(stats.leadsToday)}
          description="Captured past 24 hours"
          icon={Calendar}
        />
      </div>

      {/* Account Status Card & Getting Started Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Getting Started Checklist */}
        <Card className="lg:col-span-2 border-border bg-card shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Getting Started Checklist</CardTitle>
                <CardDescription className="text-xs">
                  Complete these 4 steps to launch your automated comment-to-lead workflow.
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {isConnected ? 1 : 0} of 4 Completed
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistStep
              step="1"
              title="Connect your Instagram Professional account"
              description="Authorize RawReply to receive comment webhooks and send automated direct messages."
              href="/api/auth/meta/authorize?platform=instagram&returnTo=/dashboard"
              actionLabel={isConnected ? "Linked" : "Connect Account"}
              completed={isConnected}
              isLink={!isConnected}
            />
            <ChecklistStep
              step="2"
              title="Select a post and create your first comment trigger"
              description="Choose an Instagram post or Reel below to listen for comments and send automated DMs."
              href="#media-library"
              actionLabel="Select Post"
              completed={stats.activeAutomations > 0}
              isLink={true}
            />
            <ChecklistStep
              step="3"
              title="Configure phone number validation questions"
              description="Customize the automated questions commenters must answer to become qualified leads."
              href="/dashboard/automations"
              actionLabel="Configure"
              completed={false}
              isLink={true}
            />
            <ChecklistStep
              step="4"
              title="Set up Excel lead export destination"
              description="Connect Microsoft Excel to automatically sync qualified leads in real time."
              href="/dashboard/integrations"
              actionLabel="Integrations"
              completed={false}
              isLink={true}
            />
          </CardContent>
        </Card>

        {/* Dynamic Connected Account Section */}
        <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Connected Account</CardTitle>
              <StatusBadge
                status={isConnected ? "connected" : "not_connected"}
                label={isConnected ? "Active" : "Disconnected"}
              />
            </div>
            <CardDescription className="text-xs">
              Primary social channel for real-time webhooks & DMs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isConnected ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3.5">
                  {primaryAccount.profilePictureUrl ? (
                    <Image
                      src={primaryAccount.profilePictureUrl}
                      alt={primaryAccount.username}
                      width={44}
                      height={44}
                      className="size-11 rounded-full border border-border object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs">
                      <Instagram className="size-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        @{primaryAccount.username}
                      </h4>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold border-pink-200 bg-pink-50/70 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-300">
                        IG Professional
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {primaryAccount.name || primaryAccount.pageName || "Instagram Creator / Business"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                      ID: {primaryAccount.id}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Webhook Subscribed: Feed comments & direct messages</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    asChild
                  >
                    <a href="/api/auth/meta/authorize?platform=instagram&returnTo=/dashboard">
                      <RefreshCw className="size-3 mr-1.5" />
                      Reconnect
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="size-3 mr-1" />
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center justify-center flex-col">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Instagram className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">No Account Connected</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Connect your Instagram Professional account to activate real-time comment automation.
                    </p>
                  </div>
                </div>

                <Button size="sm" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold" asChild>
                  <a href="/api/auth/meta/authorize?platform=instagram&returnTo=/dashboard">
                    <Instagram className="size-4 mr-1.5" />
                    Connect Instagram Account
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-Platform Comment Automations & Live Media Section */}
      <div id="media-library" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-foreground">
                Multi-Platform Comment Automations
              </h3>
              {isConnected ? (
                <Badge variant="outline" className="border-primary-accent/40 bg-primary-accent/10 text-primary-accent font-semibold text-xs inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  @{primaryAccount.username}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  Disconnected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isConnected
                ? `Select a post or Reel from @${primaryAccount.username} to create comment triggers and qualify leads automatically.`
                : "Connect your Instagram Professional account above to view your posts and create automated triggers."}
            </p>
          </div>

          {isConnected && (
            <div className="flex items-center gap-2">
              {/* Media Filter Tabs */}
              <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMediaFilter("all")}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    mediaFilter === "all"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({media.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter("video")}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                    mediaFilter === "video"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Video className="size-3" /> Reels ({videoCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaFilter("image")}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                    mediaFilter === "image"
                      ? "bg-background text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="size-3" /> Images ({imageCount})
                </button>
              </div>

              <Button
                size="xs"
                variant="outline"
                onClick={() => fetchMedia(primaryAccount.id, true)}
                disabled={mediaLoading}
                className="text-xs"
              >
                <RefreshCw className={`size-3 mr-1 ${mediaLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Media Grid or Disconnected Empty State */}
        {!isConnected ? (
          <Card className="border-dashed border-border bg-card/40 p-6 sm:p-8 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Instagram className="size-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Media Library Awaiting Connection
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your Instagram Professional account above to automatically load your published posts, videos, and Reels here and set up automated comment triggers.
              </p>
            </div>
          </Card>
        ) : mediaLoading ? (
          /* Shimmer Loading Grid */
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2.5 animate-pulse">
                <div className="aspect-square w-full rounded-lg bg-muted" />
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <Card className="border-dashed border-border bg-card/60 p-8 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
              <ImageIcon className="size-8 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">No media found</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {mediaError
                  ? `Notice: ${mediaError}. Click refresh or reconnect your account.`
                  : `No ${mediaFilter === "all" ? "posts or Reels" : mediaFilter} found on @${primaryAccount.username}. Publish a post on Instagram and click Refresh.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMedia(primaryAccount.id, true)}
                className="mt-2 text-xs"
              >
                <RefreshCw className="size-3 mr-1.5" />
                Refresh Media
              </Button>
            </div>
          </Card>
        ) : (
          /* Live Media Grid */
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredMedia.map((item) => {
              const isVideo = item.mediaType === "VIDEO";
              const displayImage = item.thumbnailUrl || item.mediaUrl;
              const existingAuto = (overview?.automations || []).find((a) => {
                const aPostId = String(a.postId || a.post_id || "").replace(/^med_/, "");
                const currentPostId = String(item.id || "").replace(/^med_/, "");
                return aPostId && currentPostId && aPostId === currentPostId;
              });

              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden border bg-card shadow-xs transition-all flex flex-col justify-between group ${
                    existingAuto
                      ? "border-emerald-300 dark:border-emerald-800/60 ring-1 ring-emerald-500/10"
                      : "border-border hover:border-primary-accent/40"
                  }`}
                >
                  <div className="relative aspect-square w-full bg-muted overflow-hidden">
                    {displayImage ? (
                      <Image
                        src={displayImage}
                        alt={item.caption || "Instagram media"}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground bg-muted">
                        <ImageIcon className="size-10 opacity-40" />
                      </div>
                    )}

                    {/* Media Type Badge & Status */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="bg-black/60 text-white backdrop-blur-xs text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 inline-flex items-center gap-1 border-0"
                      >
                        {isVideo ? <Video className="size-3" /> : <ImageIcon className="size-3" />}
                        {isVideo ? "Reel" : "Post"}
                      </Badge>

                      {existingAuto && (
                        <Badge className="bg-emerald-600/90 text-white text-[9px] font-bold uppercase py-0.5 px-2 border-0 shadow-xs flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-white animate-pulse" />
                          Active
                        </Badge>
                      )}
                    </div>

                    {/* Open on Instagram Link */}
                    {item.permalink && (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors"
                        title="View on Instagram"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>

                  <CardContent className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      {/* Caption */}
                      <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {item.caption || <span className="italic text-muted-foreground">No caption</span>}
                      </p>

                      {/* Engagement Metrics */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3 text-red-500" />
                          {item.likeCount || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3 text-blue-500" />
                          {item.commentsCount || 0}
                        </span>
                        {item.publishedAt && (
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {new Date(item.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trigger Action Button */}
                    <div className="pt-2">
                      {existingAuto ? (
                        <Button
                          size="xs"
                          variant="outline"
                          className="w-full text-xs font-semibold border-emerald-500/50 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          asChild
                        >
                          <Link href={`/dashboard/automations?selectPost=${item.id}`}>
                            <Sparkles className="size-3 mr-1.5 text-emerald-600" />
                            Edit Automation
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          className="w-full text-xs font-semibold bg-primary-accent hover:bg-primary-accent-dark text-white"
                          onClick={() => handleOpenQuickBuilder(item)}
                        >
                          <Sparkles className="size-3 mr-1.5" />
                          Create Automation
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Automation Builder Modal */}
      {quickBuilderOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary-accent text-white">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    New Comment-to-DM Trigger
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Listening to @{primaryAccount.username}&apos;s post
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickBuilderOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAutomation} className="p-4 sm:p-5 space-y-4">
              {/* Selected Post Preview */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="relative size-14 rounded-md overflow-hidden bg-muted shrink-0">
                  {selectedPost.thumbnailUrl || selectedPost.mediaUrl ? (
                    <Image
                      src={selectedPost.thumbnailUrl || selectedPost.mediaUrl}
                      alt="Selected Post"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {selectedPost.caption || "Instagram Post"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    Post ID: {selectedPost.id}
                  </p>
                </div>
              </div>

              {/* Automation Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Automation Name</label>
                <Input
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="e.g. Lead Capture for Promo Reel"
                  required
                  className="text-xs"
                />
              </div>

              {/* Trigger Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">When someone comments</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriggerType("any")}
                    className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      triggerType === "any"
                        ? "border-primary-accent bg-primary-accent/10 font-semibold text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>Any Comment</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      Replies to every commenter
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriggerType("keyword")}
                    className={`rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      triggerType === "keyword"
                        ? "border-primary-accent bg-primary-accent/10 font-semibold text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div>Specific Keyword</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      Only when matching words
                    </div>
                  </button>
                </div>
              </div>

              {/* Keywords Input */}
              {triggerType === "keyword" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Trigger Keywords (comma-separated)
                  </label>
                  <Input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. PRICE, SEND, INFO, DEAL"
                    required
                    className="text-xs font-mono"
                  />
                </div>
              )}

              {/* Public Comment Reply */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Public Comment Reply</label>
                <Input
                  value={publicReply}
                  onChange={(e) => setPublicReply(e.target.value)}
                  placeholder="e.g. Thanks for commenting! Check your DM."
                  required
                  className="text-xs"
                />
              </div>

              {/* Private DM Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Private Direct Message (DM)</label>
                <textarea
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  placeholder="e.g. Hi! Thanks for reaching out. Please send your phone number..."
                  rows={3}
                  required
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground">
                  When the commenter replies with a valid phone number, they qualify as a lead automatically.
                </p>
              </div>

              {/* Error or Success notification */}
              {autoSaveError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>{autoSaveError}</span>
                </div>
              )}
              {autoSaveSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{autoSaveSuccess}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickBuilderOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingAuto}
                  className="bg-primary-accent hover:bg-primary-accent-dark text-white font-semibold"
                >
                  {savingAuto ? "Activating..." : "Activate Automation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistStep({ step, title, description, href, actionLabel, completed, isLink = true }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3 transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground mt-0.5">
          {completed ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <span>{step}</span>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-foreground">{title}</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-normal">
            {description}
          </p>
        </div>
      </div>
      {isLink ? (
        <Button variant="outline" size="xs" asChild className="shrink-0">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      ) : (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 shrink-0 text-xs">
          {actionLabel}
        </Badge>
      )}
    </div>
  );
}
