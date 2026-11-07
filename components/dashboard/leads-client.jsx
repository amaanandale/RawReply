"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Download,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Plus,
  X,
  History,
  AlertCircle,
  FileDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  new: { label: "New", color: "bg-blue-50 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  qualified: { label: "Qualified", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  converted: { label: "Converted", color: "bg-purple-50 text-purple-700 border-purple-200" },
  not_interested: { label: "Not Interested", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function LeadsClient({ initialData, initialStats }) {
  const [leads, setLeads] = React.useState(initialData?.leads || []);
  const [stats, setStats] = React.useState(initialStats || {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    notInterested: 0,
    exported: 0,
  });

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [sortOrder, setSortOrder] = React.useState("newest");
  const [selectedLeads, setSelectedLeads] = React.useState(new Set());
  const [isLoading, setIsLoading] = React.useState(false);

  // Active Modals & Feedback
  const [activeLead, setActiveLead] = React.useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
  const [exportHistory, setExportHistory] = React.useState([]);
  const [exportLoading, setExportLoading] = React.useState(false);
  const [exportMessage, setExportMessage] = React.useState(null);
  const [copiedPhone, setCopiedPhone] = React.useState(null);

  // Note form state
  const [newNote, setNewNote] = React.useState("");
  const [noteLoading, setNoteLoading] = React.useState(false);

  // Debounced Search & Filter fetch
  const fetchLeads = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      params.set("sort", sortOrder);
      params.set("limit", "100");

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, sortOrder]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Copy phone number helper
  const handleCopyPhone = (phone, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Toggle selection
  const handleToggleSelect = (id) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  };

  // Update lead status
  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? data.lead : l))
        );
        if (activeLead && activeLead.id === leadId) {
          setActiveLead(data.lead);
        }
        fetchLeads();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Add internal note
  const handleAddNote = async (leadId) => {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewNote("");
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? data.lead : l))
        );
        setActiveLead(data.lead);
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setNoteLoading(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId) => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setSelectedLeads((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
        setActiveLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  // Export handlers
  const handleDownloadXlsx = async (mode = "selected") => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const leadIds = mode === "selected" ? Array.from(selectedLeads) : [];
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "download_xlsx",
          filter: mode,
          leadIds,
          filters: { search, status: selectedStatus },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate Excel file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rawreply-qualified-leads-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportMessage({
        type: "success",
        text: "Excel file downloaded successfully! Leads marked as exported.",
      });
      fetchLeads();
      setTimeout(() => setIsExportModalOpen(false), 1500);
    } catch (err) {
      setExportMessage({ type: "error", text: err.message });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSyncToMicrosoftExcel = async (mode = "selected") => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const leadIds = mode === "selected" ? Array.from(selectedLeads) : [];
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sync_excel",
          filter: mode,
          leadIds,
          filters: { search, status: selectedStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync to Microsoft Excel");
      }

      setExportMessage({
        type: "success",
        text: `Successfully synced ${data.appendedCount} qualified leads to ${data.destination}!`,
      });
      fetchLeads();
      setTimeout(() => setIsExportModalOpen(false), 2000);
    } catch (err) {
      setExportMessage({ type: "error", text: err.message });
    } finally {
      setExportLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsHistoryModalOpen(true);
    try {
      const res = await fetch("/api/leads/export/history");
      if (res.ok) {
        const data = await res.json();
        setExportHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Qualified Leads"
        description="Customers who completed Instagram DM requirements and submitted a verified international mobile number."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              className="text-xs h-9 min-h-[44px] sm:min-h-[36px]"
            >
              <History className="size-3.5 mr-1.5" />
              Export History
            </Button>
            <Button
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              disabled={leads.length === 0}
              className="text-xs h-9 font-semibold min-h-[44px] sm:min-h-[36px]"
            >
              <Download className="size-4 mr-1.5" />
              Export Leads {selectedLeads.size > 0 ? `(${selectedLeads.size})` : `(${leads.length})`}
            </Button>
          </div>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Qualified
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Verified Phone Numbers</p>
        </Card>
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            New Leads
          </p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.new}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting First Outreach</p>
        </Card>
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Converted
          </p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.converted}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Closed Customers</p>
        </Card>
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Exported to Excel
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.exported}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Synced to Spreadsheet</p>
        </Card>
      </div>

      {/* Core Business Rule Notice Banner */}
      <div className="rounded-lg border border-primary-accent/25 bg-primary-accent-light/60 p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <Phone className="size-4 shrink-0 text-primary-accent mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <h4 className="text-xs font-semibold text-primary-accent">
              Core Business Rule: Verified Mobile Numbers Only
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              RawReply deliberately ignores general commenters and incomplete DM conversations. A commenter only becomes a <strong>qualified lead</strong> once they answer your questions and submit a valid mobile number in E.164 format.
            </p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Bulk Selection Bar */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or @username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs min-h-[44px] sm:min-h-[36px]"
              />
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 min-h-[44px] sm:min-h-[36px] rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="not_interested">Not Interested</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                className="text-xs h-9 min-h-[44px] sm:min-h-[36px]"
              >
                <ArrowUpDown className="size-3.5 mr-1" />
                {sortOrder === "newest" ? "Newest First" : "Oldest First"}
              </Button>
            </div>
          </div>

          {/* Bulk Selection Banner */}
          {selectedLeads.size > 0 && (
            <div className="flex items-center justify-between rounded-md bg-muted/60 p-2.5 text-xs border border-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLeads(new Set())}
                  className="text-muted-foreground hover:text-foreground underline ml-2"
                >
                  Clear selection
                </button>
              </div>
              <Button
                size="xs"
                onClick={() => setIsExportModalOpen(true)}
                className="text-xs font-semibold h-8"
              >
                <Download className="size-3 mr-1" />
                Export Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area: Responsive Mobile Cards (< md) vs Desktop Table (>= md) */}
      {leads.length > 0 ? (
        <>
          {/* 1. Mobile-First Responsive Cards (< md screens) */}
          <div className="grid gap-3 md:hidden">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>Showing {leads.length} qualified leads</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="font-semibold text-primary-accent"
              >
                {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {leads.map((lead) => {
              const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
              const isSelected = selectedLeads.has(lead.id);

              return (
                <Card
                  key={lead.id}
                  onClick={() => setActiveLead(lead)}
                  className={`border p-4 transition-all cursor-pointer shadow-xs ${
                    isSelected ? "border-primary-accent bg-primary-accent-light/10" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(lead.id);
                        }}
                        className="size-4 rounded border-border text-primary-accent focus:ring-primary-accent"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{lead.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          {lead.instagramUsername || "@instagram_user"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Phone Number with tap-to-copy */}
                  <div className="mt-3 flex items-center justify-between rounded-md bg-muted/40 p-2.5 border border-border/60">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                      <Phone className="size-3.5 text-primary-accent" />
                      <span>{lead.phoneNumber}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({lead.countryCode})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(lead.phoneNumber, e)}
                      className="flex items-center gap-1 text-[11px] text-primary-accent hover:underline font-semibold"
                    >
                      {copiedPhone === lead.phoneNumber ? (
                        <>
                          <Check className="size-3 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Footer details */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2.5">
                    <span>{lead.sourceAutomationName || "Post Comment"}</span>
                    <span>{new Date(lead.submittedAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 2. Desktop Structured Data Table (>= md screens) */}
          <div className="hidden md:block">
            <Card className="border-border shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={leads.length > 0 && selectedLeads.size === leads.length}
                        onChange={handleSelectAll}
                        className="size-4 rounded border-border text-primary-accent focus:ring-primary-accent"
                      />
                    </TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Instagram User</TableHead>
                    <TableHead>Source Automation</TableHead>
                    <TableHead>Source Post</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Excel Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                    const isSelected = selectedLeads.has(lead.id);

                    return (
                      <TableRow
                        key={lead.id}
                        className={`cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? "bg-primary-accent-light/10" : ""
                        }`}
                        onClick={() => setActiveLead(lead)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lead.id)}
                            className="size-4 rounded border-border text-primary-accent focus:ring-primary-accent"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-foreground">
                            <span>{lead.phoneNumber}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(lead.phoneNumber, e)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy Phone"
                            >
                              {copiedPhone === lead.phoneNumber ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-xs text-foreground">{lead.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {lead.instagramUsername || "@instagram_user"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lead.sourceAutomationName || "Comment DM Trigger"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {lead.sourcePostId ? `post_${lead.sourcePostId.slice(-6)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(lead.submittedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-bold uppercase ${statusCfg.color}`}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.exportedToExcel ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <CheckCircle2 className="size-3.5" /> Exported
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                              <Clock className="size-3.5" /> Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setActiveLead(lead)}
                            className="text-xs"
                          >
                            Details <ChevronRight className="size-3 ml-0.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      ) : (
        /* Empty State */
        <Card className="border-dashed border-border p-8 sm:p-12 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 mx-auto mb-4 text-primary-accent border border-border">
            <Users className="size-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No Qualified Leads Captured Yet
          </h3>
          <p className="mt-1.5 max-w-md mx-auto text-xs text-muted-foreground leading-relaxed">
            When users comment on your Instagram posts, RawReply initiates automated DM flows asking for their phone number. Only commenters who submit a valid international phone number appear here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="sm" asChild className="h-9 min-h-[44px]">
              <Link href="/dashboard/automations">Configure DM Automation</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-9 min-h-[44px]">
              <Link href="/dashboard/integrations">Configure Excel Integration</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ─── MODAL 1: Lead Details & Notes Drawer ───────────────────── */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">{activeLead.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {activeLead.instagramUsername}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveLead(null)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Phone & Status Overview */}
            <div className="rounded-lg bg-muted/40 p-3.5 border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Mobile Number (E.164)</span>
                <button
                  type="button"
                  onClick={() => handleCopyPhone(activeLead.phoneNumber)}
                  className="flex items-center gap-1 font-mono text-xs font-bold text-primary-accent hover:underline"
                >
                  {copiedPhone === activeLead.phoneNumber ? (
                    <>
                      <Check className="size-3 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> {activeLead.phoneNumber}
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-xs text-muted-foreground">Sales Lead Status</span>
                <select
                  value={activeLead.status}
                  onChange={(e) => handleUpdateStatus(activeLead.id, e.target.value)}
                  className="h-8 rounded border border-input bg-background px-2.5 text-xs font-semibold text-foreground"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>
            </div>

            {/* Source Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Source Automation</span>
                <span className="font-medium text-foreground">{activeLead.sourceAutomationName || "Comment DM"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Source Post ID</span>
                <span className="font-mono text-foreground">{activeLead.sourcePostId || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Submission Date</span>
                <span className="text-foreground">{new Date(activeLead.submittedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Excel Export</span>
                <span className="text-foreground">
                  {activeLead.exportedToExcel ? `Exported on ${new Date(activeLead.exportedAt).toLocaleDateString()}` : "Not exported"}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-primary-accent" />
                Internal Team Notes ({activeLead.notes?.length || 0})
              </h4>

              {activeLead.notes && activeLead.notes.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeLead.notes.map((note) => (
                    <div key={note.id} className="rounded bg-muted/60 p-2.5 text-xs border border-border/60">
                      <p className="text-foreground leading-relaxed">{note.text}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{note.authorName}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes recorded yet.</p>
              )}

              {/* Add Note Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note (e.g. called customer, requested pricing)..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="text-xs min-h-[36px]"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddNote(activeLead.id)}
                  disabled={noteLoading || !newNote.trim()}
                  className="text-xs shrink-0"
                >
                  Add Note
                </Button>
              </div>
            </div>

            {/* Footer / Delete */}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <Button
                variant="destructive"
                size="xs"
                onClick={() => handleDeleteLead(activeLead.id)}
                className="text-xs"
              >
                <Trash2 className="size-3 mr-1" /> Delete Lead
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setActiveLead(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Export Options Modal ──────────────────────────── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Export Qualified Leads</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only customers who submitted a valid phone number will be exported.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExportModalOpen(false)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {exportMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  exportMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {exportMessage.type === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
                )}
                <span>{exportMessage.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">Choose Export Destination:</p>

              {/* Option 1: Direct .xlsx download */}
              <div
                onClick={() => !exportLoading && handleDownloadXlsx(selectedLeads.size > 0 ? "selected" : "all")}
                className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:border-primary-accent hover:bg-muted/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileDown className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">Download Excel File (.xlsx)</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Export {selectedLeads.size > 0 ? `${selectedLeads.size} selected` : `all ${leads.length}`} leads directly to your computer.
                    </p>
                  </div>
                </div>
                <Button size="xs" variant="outline" disabled={exportLoading}>
                  Download
                </Button>
              </div>

              {/* Option 2: Microsoft Graph API Sync */}
              <div
                onClick={() => !exportLoading && handleSyncToMicrosoftExcel(selectedLeads.size > 0 ? "selected" : "all")}
                className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:border-primary-accent hover:bg-muted/40 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">Sync to Microsoft Excel Online</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Append rows directly into your connected OneDrive workbook via Microsoft Graph.
                    </p>
                  </div>
                </div>
                <Button size="xs" variant="outline" disabled={exportLoading}>
                  Sync Online
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExportModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Export History Drawer ─────────────────────────── */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Excel Export History</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit log of spreadsheet downloads and Microsoft Excel sync events.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHistoryModalOpen(false)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {exportHistory.length > 0 ? (
              <div className="space-y-2.5">
                {exportHistory.map((h) => (
                  <div key={h.id} className="rounded-lg border border-border p-3 text-xs bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <FileSpreadsheet className="size-3.5 text-primary-accent" />
                        {h.destination}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          h.status === "success"
                            ? "bg-emerald-50 text-emerald-700 text-[10px]"
                            : "bg-red-50 text-red-700 text-[10px]"
                        }
                      >
                        {h.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] pt-1">
                      <span>{h.leadsCount} qualified lead{h.leadsCount !== 1 ? "s" : ""}</span>
                      <span>{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    {h.error && <p className="text-[11px] text-red-600 mt-1">{h.error}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                No lead exports recorded yet.
              </p>
            )}

            <div className="border-t border-border pt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

