"use client";

import * as React from "react";
import Link from "next/link";
import {
  Zap,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MessageSquare,
  Send,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Edit,
  Clock,
  History,
  Check,
  X,
  ChevronRight,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { Instagram, Facebook } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function AutomationsManager() {
  const [activeTab, setActiveTab] = React.useState("media"); // 'media' | 'automations'

  // Accounts state
  const [accounts, setAccounts] = React.useState([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState("");
  const [accountsLoading, setAccountsLoading] = React.useState(true);

  // Media state
  const [mediaItems, setMediaItems] = React.useState([]);
  const [mediaLoading, setMediaLoading] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(null);
  const [mediaPaging, setMediaPaging] = React.useState(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Automations state
  const [automations, setAutomations] = React.useState([]);
  const [automationsLoading, setAutomationsLoading] = React.useState(false);
  const [automationSearch, setAutomationSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all"); // 'all' | 'active' | 'paused'
  const [platformFilter, setPlatformFilter] = React.useState("all"); // 'all' | 'instagram' | 'facebook'

  // Builder Modal state
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [selectedMediaForBuilder, setSelectedMediaForBuilder] = React.useState(null);
  const [editingAutomation, setEditingAutomation] = React.useState(null);

  // Execution History Modal state
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [historyAutomation, setHistoryAutomation] = React.useState(null);
  const [executions, setExecutions] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  // Builder Form Fields
  const [formName, setFormName] = React.useState("");
  const [formTriggerType, setFormTriggerType] = React.useState("any"); // 'any' | 'keyword'
  const [formKeywords, setFormKeywords] = React.useState("");
  const [formKeywordMatchType, setFormKeywordMatchType] = React.useState("contains"); // 'contains' | 'exact'
  const [formPublicReplyEnabled, setFormPublicReplyEnabled] = React.useState(true);
  const [formPublicReplyText, setFormPublicReplyText] = React.useState("Thanks for commenting! Check your DM.");
  const [formDmEnabled, setFormDmEnabled] = React.useState(true);
  const [formDmText, setFormDmText] = React.useState(
    "Hi! Thanks for your comment. Please reply with your mobile phone number so our team can send you the full details."
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [formSuccess, setFormSuccess] = React.useState(null);

  // 1. Load Connected Social Accounts (Instagram + Facebook)
  const fetchAccounts = React.useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        const accs = data.accounts || [];
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setAccountsLoading(false);
    }
  }, [selectedAccountId]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAccounts]);

  // 2. Load Media / Posts for Selected Account
  const fetchMedia = React.useCallback(async (accId, forceRefresh = false, cursor = null) => {
    if (!accId) return;
    if (cursor) {
      setLoadingMore(true);
    } else {
      setMediaLoading(true);
      setMediaError(null);
    }

    try {
      let url = `/api/instagram/media?accountId=${encodeURIComponent(accId)}`;
      if (forceRefresh) url += "&refresh=true";
      if (cursor) url += `&after=${encodeURIComponent(cursor)}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load posts.");
      }

      if (cursor) {
        setMediaItems((prev) => [...prev, ...(json.media || [])]);
      } else {
        setMediaItems(json.media || []);
      }
      setMediaPaging(json.paging || null);
    } catch (err) {
      setMediaError(err.message);
    } finally {
      setMediaLoading(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedAccountId) {
      const timer = setTimeout(() => {
        fetchMedia(selectedAccountId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedAccountId, fetchMedia]);

  // 3. Load Configured Automations
  const fetchAutomations = React.useCallback(async () => {
    setAutomationsLoading(true);
    try {
      const res = await fetch("/api/automations");
      if (res.ok) {
        const json = await res.json();
        setAutomations(json.automations || []);
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
    } finally {
      setAutomationsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchAutomations();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAutomations]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isFacebookAccount = selectedAccount?.platform === "facebook";

  // Open Builder for a Media Item
  const handleOpenBuilderForMedia = (media) => {
    setSelectedMediaForBuilder(media);
    setEditingAutomation(null);
    const platformLabel = isFacebookAccount ? "Facebook Page post" : "Instagram post";
    setFormName(`Automation for ${platformLabel}`);
    setFormTriggerType("any");
    setFormKeywords("");
    setFormKeywordMatchType("contains");
    setFormPublicReplyEnabled(true);
    setFormPublicReplyText(
      isFacebookAccount
        ? "Thanks for your comment! I just sent you a private message with details."
        : "Thanks for commenting! Check your DM."
    );
    setFormDmEnabled(true);
    setFormDmText(
      "Hi! Thanks for reaching out. Please reply with your mobile phone number so our team can send you the full details."
    );
    setFormError(null);
    setFormSuccess(null);
    setBuilderOpen(true);
  };

  // Open Builder for Editing an Existing Automation
  const handleOpenEditAutomation = (auto) => {
    setEditingAutomation(auto);
    setSelectedMediaForBuilder({
      id: auto.postId,
      mediaType: "POST",
      caption: auto.postCaption || "",
      thumbnailUrl: auto.postThumbnailUrl,
      permalink: auto.postPermalink,
      platform: auto.platform || "instagram",
    });
    setFormName(auto.name);
    setFormTriggerType(auto.triggerType);
    setFormKeywords(auto.triggerKeywords ? auto.triggerKeywords.join(", ") : (auto.triggerKeyword || ""));
    setFormKeywordMatchType(auto.keywordMatchType || "contains");
    setFormPublicReplyEnabled(auto.publicReplyEnabled);
    setFormPublicReplyText(auto.publicReplyText || "");
    setFormDmEnabled(auto.dmEnabled);
    setFormDmText(auto.dmMessageText || "");
    setFormError(null);
    setFormSuccess(null);
    setBuilderOpen(true);
  };

  // Submit Automation (Publish or Update)
  const handlePublishAutomation = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const payload = {
        name: formName,
        platform: selectedAccount?.platform || "instagram",
        accountId: selectedAccountId,
        instagramAccountId: selectedAccountId,
        postId: selectedMediaForBuilder?.id,
        postCaption: selectedMediaForBuilder?.caption,
        postThumbnailUrl: selectedMediaForBuilder?.thumbnailUrl,
        postPermalink: selectedMediaForBuilder?.permalink,
        triggerType: formTriggerType,
        triggerKeywords: formKeywords ? formKeywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        keywordMatchType: formKeywordMatchType,
        publicReplyEnabled: formPublicReplyEnabled,
        publicReplyText: formPublicReplyText,
        dmEnabled: formDmEnabled,
        dmMessageText: formDmText,
      };

      let res;
      if (editingAutomation) {
        res = await fetch(`/api/automations/${editingAutomation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to publish automation.");
      }

      setFormSuccess(
        editingAutomation
          ? "Automation updated successfully!"
          : "Automation published successfully and is now active!"
      );

      // Refresh list
      await fetchAutomations();
      setTimeout(() => {
        setBuilderOpen(false);
        setActiveTab("automations");
      }, 1000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status (Active / Paused)
  const handleToggleStatus = async (auto, e) => {
    if (e) e.stopPropagation();
    const newStatus = auto.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/automations/${auto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === auto.id ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Delete Automation
  const handleDeleteAutomation = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the automation "${name}"?`)) return;

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete automation:", err);
    }
  };

  // View Execution History Modal
  const handleOpenHistory = async (auto, e) => {
    if (e) e.stopPropagation();
    setHistoryAutomation(auto);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/automations/${auto.id}/executions`);
      if (res.ok) {
        const json = await res.json();
        setExecutions(json.executions || []);
      }
    } catch (err) {
      console.error("Failed to load executions:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filter automations list by search, status, and platform
  const filteredAutomations = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(automationSearch.toLowerCase()) ||
      (a.postCaption && a.postCaption.toLowerCase().includes(automationSearch.toLowerCase())) ||
      (a.triggerKeyword && a.triggerKeyword.toLowerCase().includes(automationSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === "active" && a.status !== "active") return false;
    if (statusFilter === "paused" && a.status !== "paused") return false;

    if (platformFilter === "instagram" && (a.platform || "instagram") !== "instagram") return false;
    if (platformFilter === "facebook" && a.platform !== "facebook") return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Multi-Platform Comment Automations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select Instagram Reels, posts, or Facebook Page posts to launch automated comment-to-DM lead qualification workflows.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "media"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="size-3.5" />
            <span>Select Media ({mediaItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("automations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "automations"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="size-3.5" />
            <span>Active Automations ({automations.length})</span>
          </button>
        </div>
      </div>

      {/* Account Selector & Slots Info Bar */}
      <Card className="border border-border bg-card shadow-xs">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              {isFacebookAccount ? (
                <Facebook className="size-4 text-[#1877F2]" />
              ) : (
                <Instagram className="size-4 text-primary-accent" />
              )}
              Connected Account / Page:
            </span>

            {accountsLoading ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Checking connected accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-4 shrink-0" />
                <span>No social accounts connected yet.</span>
                <Button size="sm" asChild variant="outline" className="h-7 text-xs ml-2">
                  <Link href="/dashboard/accounts">Connect Account</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[36px]"
                >
                  {accounts.map((acc) => {
                    const isFb = acc.platform === "facebook";
                    const label = isFb
                      ? `${acc.pageName || acc.name || acc.username} (Facebook Page)`
                      : `@${acc.username} (Instagram)`;
                    return (
                      <option key={acc.id} value={acc.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMedia(selectedAccountId, true)}
                  disabled={mediaLoading}
                  className="h-8 text-xs min-h-[36px]"
                >
                  {mediaLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <RefreshCw className="size-3 mr-1" />}
                  Refresh Posts
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Badge variant="outline" className="text-[11px] font-medium border-border">
              {accounts.length} of 4 account slots used
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: MEDIA LIBRARY GALLERY                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "media" && (
        <div className="space-y-4">
          {mediaError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{mediaError}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchMedia(selectedAccountId, true)}
                className="text-xs h-7"
              >
                Retry
              </Button>
            </div>
          )}

          {accounts.length === 0 ? (
            <Card className="border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
              <Layers className="size-10 mx-auto text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">Connect an Account to View Content</h3>
              <p className="max-w-md mx-auto text-muted-foreground leading-relaxed">
                RawReply retrieves actual Reels, videos, and posts from your Meta-authorized Instagram Professional accounts and Facebook Pages.
              </p>
              <Button asChild size="sm" className="mt-2 bg-primary-accent text-white">
                <Link href="/dashboard/accounts">Connect Account</Link>
              </Button>
            </Card>
          ) : mediaLoading && mediaItems.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                    <div className="h-7 bg-muted rounded mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : mediaItems.length === 0 ? (
            <Card className="border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
              <Video className="size-10 mx-auto text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">
                No Posts Found on this {isFacebookAccount ? "Facebook Page" : "Instagram Account"}
              </h3>
              <p className="max-w-md mx-auto text-muted-foreground leading-relaxed">
                We queried the official Meta Graph API for {selectedAccount?.pageName || `@${selectedAccount?.username}`}, but no eligible posts were returned. Publish a post, then click Refresh.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchMedia(selectedAccountId, true)}
                className="mt-2 text-xs"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Refresh from Meta
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaItems.map((item) => {
                  const isVideo = item.mediaType === "VIDEO" || item.mediaType === "REELS";
                  const itemPlatform = item.platform || (isFacebookAccount ? "facebook" : "instagram");
                  const isItemFb = itemPlatform === "facebook";

                  return (
                    <Card
                      key={item.id}
                      className="border border-border bg-card overflow-hidden shadow-xs hover:border-primary-accent/40 transition-all flex flex-col justify-between group"
                    >
                      {/* Media Thumbnail Container */}
                      <div className="relative aspect-square w-full bg-black/90 overflow-hidden">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.caption || "Social Post"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                            {isItemFb ? <Facebook className="size-8 opacity-40 mb-1 text-[#1877F2]" /> : <Video className="size-8 opacity-40 mb-1" />}
                            <span className="text-[10px]">Media Asset</span>
                          </div>
                        )}

                        {/* Media Type & Platform Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <Badge
                            className={`border-none text-[9px] font-bold uppercase tracking-wider py-0.5 px-2 ${
                              isItemFb
                                ? "bg-[#1877F2] text-white"
                                : "bg-black/75 backdrop-blur-xs text-white"
                            }`}
                          >
                            {isItemFb ? (
                              <Facebook className="size-2.5 mr-1 inline" />
                            ) : isVideo ? (
                              <Video className="size-3 mr-1 inline" />
                            ) : (
                              <ImageIcon className="size-3 mr-1 inline" />
                            )}
                            {item.mediaType}
                          </Badge>
                        </div>

                        {/* External Link */}
                        {item.permalink && (
                          <a
                            href={item.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/90 transition-colors"
                            title={`Open on ${isItemFb ? "Facebook" : "Instagram"}`}
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      {/* Content & Action */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between text-xs space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-relaxed">
                            {item.caption || "(No caption provided)"}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                            <span>ID: {item.id.slice(0, 10)}...</span>
                            <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenBuilderForMedia(item)}
                          className="w-full text-xs font-semibold bg-primary-accent hover:bg-primary-accent/90 text-white min-h-[36px]"
                        >
                          <Zap className="size-3.5 mr-1.5" />
                          Create Automation
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Load More Pagination */}
              {mediaPaging?.cursors?.after && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMedia(selectedAccountId, false, mediaPaging.cursors.after)}
                    disabled={loadingMore}
                    className="text-xs min-h-[36px]"
                  >
                    {loadingMore ? <Loader2 className="size-3 animate-spin mr-1.5" /> : null}
                    Load More Posts
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: ACTIVE AUTOMATIONS DASHBOARD                        */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "automations" && (
        <div className="space-y-4">
          {/* Search, Platform Pills, and Status Filters */}
          <Card className="border border-border bg-card shadow-xs">
            <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter automations by name or keyword..."
                  value={automationSearch}
                  onChange={(e) => setAutomationSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Platform Filter */}
                <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPlatformFilter("all")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      platformFilter === "all" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Platforms
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatformFilter("instagram")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                      platformFilter === "instagram" ? "bg-primary-accent text-white font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Instagram className="size-3" />
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatformFilter("facebook")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                      platformFilter === "facebook" ? "bg-[#1877F2] text-white font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Facebook className="size-3" />
                    Facebook
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === "all" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("active")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === "active" ? "bg-emerald-600 text-white font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("paused")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      statusFilter === "paused" ? "bg-amber-600 text-white font-semibold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Paused
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {automationsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Loading automations...</span>
            </div>
          ) : filteredAutomations.length === 0 ? (
            <Card className="border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
              <Zap className="size-8 mx-auto text-muted-foreground/40" />
              <h3 className="text-sm font-semibold text-foreground">No Automations Configured</h3>
              <p className="max-w-md mx-auto text-muted-foreground leading-relaxed">
                You haven&apos;t built any comment-to-DM workflows matching your filter. Switch to the &ldquo;Select Media&rdquo; tab to pick a post and create your first automation.
              </p>
              <Button size="sm" onClick={() => setActiveTab("media")} className="mt-2 bg-primary-accent text-white">
                <Plus className="size-3.5 mr-1.5" />
                Create Automation from Media
              </Button>
            </Card>
          ) : (
            <div className="divide-y divide-border border border-border bg-card rounded-lg shadow-xs overflow-hidden">
              {filteredAutomations.map((auto) => {
                const isActive = auto.status === "active";
                const isAutoFb = auto.platform === "facebook";

                return (
                  <div
                    key={auto.id}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Post Thumbnail Preview */}
                      <div className="size-16 rounded-md bg-black/80 overflow-hidden shrink-0 border border-border relative">
                        {auto.postThumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={auto.postThumbnailUrl}
                            alt="Post Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {isAutoFb ? (
                              <Facebook className="size-5 text-[#1877F2] opacity-60" />
                            ) : (
                              <Video className="size-5 opacity-40" />
                            )}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 p-1 rounded-tl-md text-white ${
                            isAutoFb ? "bg-[#1877F2]" : "bg-primary-accent"
                          }`}
                        >
                          {isAutoFb ? <Facebook className="size-2.5" /> : <Instagram className="size-2.5" />}
                        </span>
                      </div>

                      {/* Workflow Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm truncate">{auto.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-bold py-0 ${
                              isActive
                                ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
                                : "text-amber-700 bg-amber-500/10 border-amber-500/20"
                            }`}
                          >
                            {auto.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-semibold py-0 ${
                              isAutoFb
                                ? "border-blue-200 bg-blue-50 text-[#1877F2]"
                                : "border-pink-200 bg-pink-50 text-pink-700"
                            }`}
                          >
                            {isAutoFb ? "Facebook" : "Instagram"}
                          </Badge>
                          {(auto.instagramUsername || auto.accountName) && (
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              {auto.instagramUsername || auto.accountName}
                            </span>
                          )}
                        </div>

                        {auto.postCaption && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                            &ldquo;{auto.postCaption}&rdquo;
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                          <span>
                            Trigger:{" "}
                            <strong className="text-foreground">
                              {auto.triggerType === "any"
                                ? "Any Comment"
                                : `Keywords: ${auto.triggerKeywords?.length ? auto.triggerKeywords.join(", ") : auto.triggerKeyword || "None"}`}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Public Reply:{" "}
                            <strong className={auto.publicReplyEnabled ? "text-emerald-600" : "text-muted-foreground"}>
                              {auto.publicReplyEnabled ? "Enabled" : "Disabled"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Private DM:{" "}
                            <strong className={auto.dmEnabled ? "text-emerald-600" : "text-muted-foreground"}>
                              {auto.dmEnabled ? "Enabled" : "Disabled"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Executions: <strong className="text-foreground">{auto.executionCount || 0}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleOpenHistory(auto, e)}
                        className="text-xs h-8"
                      >
                        <History className="size-3.5 mr-1" />
                        History ({auto.executionCount || 0})
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleToggleStatus(auto, e)}
                        className={`text-xs h-8 ${
                          isActive
                            ? "text-amber-700 border-amber-500/30 hover:bg-amber-50"
                            : "text-emerald-700 border-emerald-500/30 hover:bg-emerald-50"
                        }`}
                      >
                        {isActive ? "Pause" : "Activate"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditAutomation(auto)}
                        className="text-xs h-8 px-2"
                      >
                        <Edit className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteAutomation(auto.id, auto.name, e)}
                        className="text-xs h-8 px-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE AUTOMATION BUILDER MODAL                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <Zap className="size-4 text-primary-accent" />
                  <span>
                    {editingAutomation ? "Edit Automation Workflow" : "Configure Comment-to-DM Automation"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold py-0 ml-1 ${
                      isFacebookAccount
                        ? "border-blue-200 bg-blue-50 text-[#1877F2]"
                        : "border-pink-200 bg-pink-50 text-pink-700"
                    }`}
                  >
                    {isFacebookAccount ? "Facebook Page" : "Instagram"}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set trigger rules, public comment replies, and private DM lead qualification questions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuilderOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handlePublishAutomation} className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {formError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* 1. Selected Post Overview */}
              <div className="space-y-2">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  1. Selected {isFacebookAccount ? "Facebook Page Post" : "Instagram Post / Reel"}
                </span>
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center gap-3.5">
                  <div className="size-16 rounded-md bg-black/80 overflow-hidden shrink-0 border border-border">
                    {selectedMediaForBuilder?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMediaForBuilder.thumbnailUrl}
                        alt="Post thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {isFacebookAccount ? <Facebook className="size-6 text-[#1877F2]" /> : <Video className="size-6 opacity-40" />}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{selectedMediaForBuilder?.caption || "(No caption)"}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Post ID: {selectedMediaForBuilder?.id} • Target:{" "}
                      {selectedAccount?.pageName || `@${selectedAccount?.username}`}
                    </p>
                    {selectedMediaForBuilder?.permalink && (
                      <a
                        href={selectedMediaForBuilder.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary-accent hover:underline inline-flex items-center gap-1"
                      >
                        <span>View post on {isFacebookAccount ? "Facebook" : "Instagram"}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Automation Name */}
              <div className="space-y-1.5">
                <label className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  2. Automation Name
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Price Inquiry Lead Collector"
                  required
                  className="text-xs"
                />
              </div>

              {/* 3. Trigger Configuration */}
              <div className="space-y-3">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  3. Trigger Condition
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormTriggerType("any")}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      formTriggerType === "any"
                        ? "border-primary-accent bg-primary-accent/5 ring-1 ring-primary-accent"
                        : "border-border bg-card hover:border-primary-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">Option A: Any Comment</span>
                      <input
                        type="radio"
                        checked={formTriggerType === "any"}
                        onChange={() => setFormTriggerType("any")}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Responds to every incoming comment on this post, initiating the qualification workflow.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormTriggerType("keyword")}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      formTriggerType === "keyword"
                        ? "border-primary-accent bg-primary-accent/5 ring-1 ring-primary-accent"
                        : "border-border bg-card hover:border-primary-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground">Option B & C: Specific Keywords</span>
                      <input
                        type="radio"
                        checked={formTriggerType === "keyword"}
                        onChange={() => setFormTriggerType("keyword")}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Triggers only when a comment contains configured keywords (e.g. &ldquo;price&rdquo;, &ldquo;details&rdquo;, &ldquo;info&rdquo;).
                    </p>
                  </div>
                </div>

                {formTriggerType === "keyword" && (
                  <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Trigger Keywords (Comma separated)
                      </label>
                      <Input
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        placeholder="e.g. price, details, cost, link, buy"
                        className="text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Case-insensitive matching. Multiple keywords will match if ANY of them are present.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="text-[11px] font-semibold text-foreground">Matching Style:</label>
                      <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="matchType"
                          value="contains"
                          checked={formKeywordMatchType === "contains"}
                          onChange={() => setFormKeywordMatchType("contains")}
                        />
                        <span>Contains Keyword</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                        <input
                          type="radio"
                          name="matchType"
                          value="exact"
                          checked={formKeywordMatchType === "exact"}
                          onChange={() => setFormKeywordMatchType("exact")}
                        />
                        <span>Exact Word Match</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Public Comment Reply Section */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                      <MessageSquare className="size-4 text-emerald-600" />
                      4. Public Comment Reply
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      This response is posted publicly under the user&apos;s comment on {isFacebookAccount ? "Facebook" : "Instagram"}.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                    <input
                      type="checkbox"
                      checked={formPublicReplyEnabled}
                      onChange={(e) => setFormPublicReplyEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>{formPublicReplyEnabled ? "Enabled" : "Disabled"}</span>
                  </label>
                </div>

                {formPublicReplyEnabled && (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={2}
                      value={formPublicReplyText}
                      onChange={(e) => setFormPublicReplyText(e.target.value)}
                      placeholder="e.g. Thanks for your comment! I just sent you a DM with the details."
                      className="w-full rounded-md border border-input bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                      maxLength={300}
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Live Public Comment Preview:</span>
                      <span>{formPublicReplyText.length}/300 characters</span>
                    </div>

                    {/* Comment Reply Preview Box */}
                    <div className="p-3 rounded bg-muted/40 border border-border/80 flex items-start gap-2.5">
                      <div
                        className={`size-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold ${
                          isFacebookAccount ? "bg-[#1877F2]" : "bg-primary-accent"
                        }`}
                      >
                        {selectedAccount?.pageName?.[0] || selectedAccount?.username?.[0]?.toUpperCase() || "R"}
                      </div>
                      <div className="text-[11px]">
                        <span className="font-bold text-foreground">
                          {isFacebookAccount ? selectedAccount?.pageName : `@${selectedAccount?.username || "your_brand"}`}
                        </span>
                        <p className="text-foreground mt-0.5">{formPublicReplyText || "..."}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Private DM Section (Lead Qualification Prompt) */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                      <Send className="size-4 text-primary-accent" />
                      5. Private Direct Message (Lead Qualification Prompt)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Sent automatically via official {isFacebookAccount ? "Facebook Messenger" : "Instagram DM"} API to collect verified contact details.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                    <input
                      type="checkbox"
                      checked={formDmEnabled}
                      onChange={(e) => setFormDmEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span>{formDmEnabled ? "Enabled" : "Disabled"}</span>
                  </label>
                </div>

                {formDmEnabled && (
                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={formDmText}
                      onChange={(e) => setFormDmText(e.target.value)}
                      placeholder="e.g. Hi! Thanks for reaching out. Please reply with your phone number so our team can send you the full details."
                      className="w-full rounded-md border border-input bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                      maxLength={1000}
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Live Private DM Preview (Requires customer mobile number):</span>
                      <span>{formDmText.length}/1000 characters</span>
                    </div>

                    {/* DM Chat Mockup Preview */}
                    <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2 max-w-sm">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground border-b border-border/50 pb-1.5">
                        {isFacebookAccount ? (
                          <Facebook className="size-3 text-[#1877F2]" />
                        ) : (
                          <Instagram className="size-3 text-primary-accent" />
                        )}
                        <span>Private Reply to Commenter</span>
                      </div>
                      <div
                        className={`rounded-2xl rounded-tl-xs p-3 text-[11px] leading-relaxed shadow-xs text-white ${
                          isFacebookAccount ? "bg-[#1877F2]" : "bg-primary-accent"
                        }`}
                      >
                        {formDmText || "..."}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Visual Workflow Diagram */}
              <div className="space-y-2">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
                  6. Automation Flow Preview
                </span>
                <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-center text-[11px]">
                  <div className="p-2 bg-card rounded border border-border font-semibold">
                    {selectedAccount?.pageName || `@${selectedAccount?.username}` || "Account"}
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <div className="p-2 bg-card rounded border border-border font-semibold">
                    Post #{selectedMediaForBuilder?.id?.slice(-6) || "Selected"}
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <div className="p-2 bg-card rounded border border-border font-semibold">
                    {formTriggerType === "any" ? "Any Comment" : `Keywords (${formKeywords || "*"})`}
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <div
                    className={`p-2 rounded border font-semibold ${
                      formPublicReplyEnabled
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-muted text-muted-foreground opacity-60"
                    }`}
                  >
                    Public Reply
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                  <div
                    className={`p-2 rounded border font-semibold ${
                      formDmEnabled
                        ? isFacebookAccount
                          ? "bg-blue-50 text-[#1877F2] border-blue-300"
                          : "bg-primary-accent/10 text-primary-accent border-primary-accent/30"
                        : "bg-muted text-muted-foreground opacity-60"
                    }`}
                  >
                    Private DM Lead Gate
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 pt-4">
                <Button variant="ghost" size="sm" type="button" onClick={() => setBuilderOpen(false)}>
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-primary-accent hover:bg-primary-accent/90 text-white min-h-[38px] px-5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Publishing to {isFacebookAccount ? "Facebook Page" : "Instagram"}...
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5 mr-1.5" />
                      {editingAutomation ? "Save Changes" : "Publish & Activate Automation"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* EXECUTION HISTORY MODAL                                   */}
      {/* ────────────────────────────────────────────────────────── */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <History className="size-4 text-primary-accent" />
                  <span>Execution History: {historyAutomation?.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-bold py-0 ${
                      historyAutomation?.platform === "facebook"
                        ? "border-blue-200 bg-blue-50 text-[#1877F2]"
                        : "border-pink-200 bg-pink-50 text-pink-700"
                    }`}
                  >
                    {historyAutomation?.platform === "facebook" ? "Facebook" : "Instagram"}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time webhook triggers executed by this automation workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {historyLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
                  <span>Querying execution records...</span>
                </div>
              ) : executions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <History className="size-8 mx-auto opacity-40" />
                  <p className="font-semibold text-foreground">No Executions Recorded Yet</p>
                  <p className="text-[11px]">When someone comments on your post, execution logs will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {executions.map((exec) => (
                    <div key={exec.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          @{exec.commenter_username || exec.commenter_id || "Commenter"}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-bold ${
                              exec.status === "success"
                                ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20"
                                : "text-destructive"
                            }`}
                          >
                            {exec.status}
                          </Badge>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(exec.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic">
                        &ldquo;{exec.comment_text}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
                        <span>Public Reply: <strong className="text-foreground">{exec.public_reply_status}</strong></span>
                        <span>•</span>
                        <span>Private DM: <strong className="text-foreground">{exec.dm_status}</strong></span>
                        {exec.matched_keyword && (
                          <>
                            <span>•</span>
                            <span>Matched: <strong className="text-primary-accent">{exec.matched_keyword}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 text-right">
              <Button variant="ghost" size="sm" onClick={() => setHistoryModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
