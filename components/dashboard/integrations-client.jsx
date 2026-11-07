"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Sheet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Plus,
  Trash2,
  X,
  FileCheck,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function IntegrationsClient({ initialData }) {
  const searchParams = useSearchParams();
  const [data, setData] = React.useState(initialData);

  const errorParam = searchParams.get("error");
  const successParam = searchParams.get("success");
  const accountParam = searchParams.get("account");
  const messageParam = searchParams.get("message");

  // Workbook selection modal states
  const [isWorkbookModalOpen, setIsWorkbookModalOpen] = React.useState(false);
  const [workbooks, setWorkbooks] = React.useState([]);
  const [worksheets, setWorksheets] = React.useState([]);
  const [selectedWb, setSelectedWb] = React.useState(null);
  const [selectedWs, setSelectedWs] = React.useState(null);
  const [newWsName, setNewWsName] = React.useState("RawReply Leads");
  const [loadingWorkbooks, setLoadingWorkbooks] = React.useState(false);
  const [loadingWorksheets, setLoadingWorksheets] = React.useState(false);
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);
  const [modalError, setModalError] = React.useState(null);

  // Disconnect loading
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to refresh integrations status:", err);
    }
  };

  const handleOpenWorkbookPicker = async () => {
    setIsWorkbookModalOpen(true);
    setLoadingWorkbooks(true);
    setModalError(null);
    try {
      const res = await fetch("/api/integrations/microsoft/workbooks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch workbooks");
      setWorkbooks(json.workbooks || []);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoadingWorkbooks(false);
    }
  };

  const handleSelectWorkbook = async (wb) => {
    setSelectedWb(wb);
    setLoadingWorksheets(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/integrations/microsoft/worksheets?workbookId=${wb.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch worksheets");
      setWorksheets(json.worksheets || []);
      if (json.worksheets?.length > 0) {
        setSelectedWs(json.worksheets[0]);
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoadingWorksheets(false);
    }
  };

  const handleSaveWorkbookConfig = async () => {
    if (!selectedWb) {
      setModalError("Please select an Excel workbook from your OneDrive.");
      return;
    }
    setIsSavingConfig(true);
    setModalError(null);
    try {
      const res = await fetch("/api/integrations/microsoft/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbook: {
            id: selectedWb.id,
            name: selectedWb.name,
            webUrl: selectedWb.webUrl,
          },
          worksheet: selectedWs ? { id: selectedWs.id, name: selectedWs.name } : { name: newWsName },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save configuration");

      setActionMessage({
        type: "success",
        text: `Target configured to ${selectedWb.name} (${selectedWs?.name || newWsName})!`,
      });
      setIsWorkbookModalOpen(false);
      fetchStatus();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDisconnectMicrosoft = async () => {
    if (!confirm("Are you sure you want to disconnect Microsoft Excel? Future automated lead exports to OneDrive will stop.")) {
      return;
    }
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/microsoft/disconnect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect Microsoft");
      setActionMessage({
        type: "success",
        text: "Microsoft Excel disconnected successfully.",
      });
      fetchStatus();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const ms = data?.microsoftExcel || {};
  const ig = data?.instagram || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Integrations"
        description="Connect third-party platforms for Instagram comment triggers and Microsoft Excel lead dispatch."
      />

      {/* Action Notification */}
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
            <p className="font-semibold text-emerald-900">Microsoft Excel Connected!</p>
            <p className="mt-0.5 text-emerald-700">
              Successfully linked {accountParam ? `account ${accountParam}` : "your Microsoft account"}. You can now select a workbook.
            </p>
          </div>
        </div>
      )}

      {errorParam && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              {errorParam === "missing_configuration" ? "Configuration Required" : "Connection Failed"}
            </p>
            <p className="mt-0.5 text-red-700">
              {messageParam || "An error occurred during OAuth authorization."}
            </p>
          </div>
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ─── 1. Instagram / Meta ─────────────────────────────────────── */}
        <Card className="flex flex-col justify-between border-border bg-card shadow-xs">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
                  <Instagram className="size-5" />
                </div>
                <StatusBadge
                  status={ig.connected ? "active" : "not_connected"}
                  label={ig.connected ? "Connected" : "Not Connected"}
                />
              </div>
              <CardTitle className="mt-3">Instagram / Meta</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Official Meta Graph API v21.0 integration for post comment listening and interactive DM questionnaires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs border-t border-border pt-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Linked Accounts</span>
                  <span className="font-semibold text-foreground">
                    {ig.accountsCount || 0} Professional {ig.accountsCount === 1 ? "Account" : "Accounts"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Messaging Window</span>
                  <span className="font-medium text-foreground">Official 24-hour limit</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Webhook Security</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="size-3.5" /> HMAC-SHA256
                  </span>
                </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="border-t border-border pt-4">
            <Button size="sm" className="w-full text-xs h-9 min-h-[44px] sm:min-h-[36px]" asChild>
              <Link href="/dashboard/accounts">
                Manage Instagram Accounts
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* ─── 2. Microsoft Excel ───────────────────────────────────────── */}
        <Card className="flex flex-col justify-between border-border bg-card shadow-xs">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <FileSpreadsheet className="size-5" />
                </div>
                <StatusBadge
                  status={ms.connected ? "active" : "not_connected"}
                  label={ms.connected ? "Connected" : "Not Connected"}
                />
              </div>
              <CardTitle className="mt-3">Microsoft Excel</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Official Microsoft Graph API integration. Automatically append verified qualified leads to an Excel workbook in OneDrive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* If not configured in environment */}
              {!ms.isConfigured && (
                <div className="rounded bg-amber-50 p-2.5 text-[11px] text-amber-900 border border-amber-200 space-y-1">
                  <p className="font-semibold">Setup Required:</p>
                  <p>Add <code className="font-mono font-semibold">MICROSOFT_CLIENT_ID</code> and <code className="font-mono font-semibold">MICROSOFT_CLIENT_SECRET</code> to <code className="font-mono">.env.local</code>.</p>
                  <p className="text-[10px] text-amber-700 font-mono">Callback: http://localhost:3000/api/auth/microsoft/callback</p>
                </div>
              )}

              {/* Connected details */}
              {ms.connected ? (
                <div className="space-y-2 text-xs border-t border-border pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Account</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">
                      {ms.accountEmail || ms.displayName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Target Workbook</span>
                    <span className="font-mono text-foreground truncate max-w-[150px]">
                      {ms.selectedWorkbook?.name || "Not configured"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Worksheet</span>
                    <span className="font-mono text-foreground truncate max-w-[150px]">
                      {ms.selectedWorksheet?.name || "RawReply Leads"}
                    </span>
                  </div>
                  {ms.lastSyncAt && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Last Export</span>
                      <span className="text-[11px] text-foreground">
                        {new Date(ms.lastSyncAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span>Lead Criteria</span>
                    <span className="font-medium text-foreground">Valid Phone Number Only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Deduplication</span>
                    <span className="font-medium text-foreground">Idempotent by E.164</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Security</span>
                    <span className="font-medium text-emerald-600">AES-256 Encrypted Tokens</span>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
          <CardFooter className="border-t border-border pt-4 flex flex-col gap-2">
            {ms.connected ? (
              <div className="flex items-center gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenWorkbookPicker}
                  className="flex-1 text-xs h-9 min-h-[44px] sm:min-h-[36px]"
                >
                  <FolderOpen className="size-3.5 mr-1.5" />
                  {ms.selectedWorkbook ? "Change Workbook" : "Select Workbook"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDisconnectMicrosoft}
                  disabled={isDisconnecting}
                  className="text-xs h-9 min-h-[44px] sm:min-h-[36px]"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                asChild
                className="w-full text-xs h-9 min-h-[44px] sm:min-h-[36px]"
              >
                <a href="/api/auth/microsoft/authorize">
                  <FileSpreadsheet className="size-3.5 mr-1.5" />
                  Connect Microsoft Excel
                </a>
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* ─── 3. Google Sheets ─────────────────────────────────────────── */}
        <Card className="flex flex-col justify-between border-border bg-card shadow-xs opacity-75">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Sheet className="size-5" />
                </div>
                <StatusBadge status="coming_soon" label="Coming Soon" />
              </div>
              <CardTitle className="mt-3">Google Sheets</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Real-time sync of qualified leads directly to Google Sheets via Google Drive API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span>Export cadence</span>
                  <span className="font-medium text-foreground">Real-time sync</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Availability</span>
                  <span className="font-medium text-foreground">Next scheduled phase</span>
                </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="border-t border-border pt-4">
            <Button variant="outline" size="sm" className="w-full text-xs h-9" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* ─── WORKBOOK & WORKSHEET PICKER MODAL ───────────────────────── */}
      {isWorkbookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground">Configure Excel Workbook</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a destination workbook and worksheet in your OneDrive.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsWorkbookModalOpen(false)}
                className="size-8 rounded-full"
              >
                <X className="size-4" />
              </Button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Step 1: Select Workbook */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                1. Select OneDrive Excel Workbook (.xlsx)
              </label>

              {loadingWorkbooks ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin mr-2" /> Scanning OneDrive for workbooks...
                </div>
              ) : workbooks.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {workbooks.map((wb) => (
                    <div
                      key={wb.id}
                      onClick={() => handleSelectWorkbook(wb)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedWb?.id === wb.id
                          ? "border-primary-accent bg-primary-accent-light/15 font-semibold text-primary-accent"
                          : "border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4" />
                        <span>{wb.name}</span>
                      </div>
                      {selectedWb?.id === wb.id && <CheckCircle2 className="size-4 text-primary-accent" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2 italic">
                  No .xlsx workbooks found in your OneDrive root. Create an Excel workbook in OneDrive and retry.
                </p>
              )}
            </div>

            {/* Step 2: Worksheet selection */}
            {selectedWb && (
              <div className="space-y-2 border-t border-border pt-3">
                <label className="text-xs font-semibold text-foreground">
                  2. Select or Create Worksheet
                </label>

                {loadingWorksheets ? (
                  <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                    <RefreshCw className="size-4 animate-spin mr-2" /> Loading worksheets...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {worksheets.length > 0 && (
                      <select
                        value={selectedWs?.name || ""}
                        onChange={(e) => {
                          const found = worksheets.find((w) => w.name === e.target.value);
                          setSelectedWs(found || { name: e.target.value });
                        }}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                      >
                        {worksheets.map((ws) => (
                          <option key={ws.id || ws.name} value={ws.name}>
                            Worksheet: {ws.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-muted-foreground">Or create new worksheet:</span>
                      <Input
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder="RawReply Leads"
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWorkbookModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveWorkbookConfig}
                disabled={!selectedWb || isSavingConfig}
                className="text-xs font-semibold"
              >
                {isSavingConfig ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

