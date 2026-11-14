"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, CheckCircle2, Clock, AlertCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataDeletionStatusChecker() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get("code") || "";

  const [code, setCode] = React.useState(initialCode);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [searched, setSearched] = React.useState(false);

  // Auto-fetch if initialCode provided in URL (?code=del_...)
  React.useEffect(() => {
    if (!initialCode || !initialCode.trim()) return;
    let ignore = false;

    fetch(`/api/auth/meta/data-deletion?code=${encodeURIComponent(initialCode.trim())}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ignore) {
          setSearched(true);
          setLoading(false);
          if (!ok || data.status === "not_found") {
            setError(data.error || "No data deletion record was found matching this confirmation code.");
            setResult(null);
          } else {
            setResult(data);
            setError(null);
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setSearched(true);
          setLoading(false);
          setError("Unable to retrieve deletion status at this time. Please check your internet connection.");
          setResult(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [initialCode]);

  const handleLookup = async (lookupCode) => {
    if (!lookupCode || !lookupCode.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/auth/meta/data-deletion?code=${encodeURIComponent(lookupCode.trim())}`);
      const data = await res.json();

      if (!res.ok || data.status === "not_found") {
        setError(data.error || "No data deletion record was found matching this confirmation code.");
        setResult(null);
      } else {
        setResult(data);
        setError(null);
      }
    } catch {
      setError("Unable to retrieve deletion status at this time. Please check your internet connection.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLookup(code);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Meta Data Deletion Request Status Tracker</h3>
          <p className="text-xs text-muted-foreground">
            Check the real-time processing status of your automated Meta deletion request.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter confirmation code (e.g., del_345d46...)"
            className="w-full h-10 px-3.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={loading || !code.trim()}
          className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4"
        >
          {loading ? (
            <>
              <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search className="size-3.5 mr-1.5" />
              Check Status
            </>
          )}
        </Button>
      </form>

      {/* Result Display */}
      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>Deletion Request Verified & Completed</span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2 text-muted-foreground pt-1 border-t border-emerald-500/20">
            <div>
              <span className="font-semibold text-foreground">Confirmation Code:</span>{" "}
              <code className="font-mono text-emerald-700">{result.confirmation_code}</code>
            </div>
            <div>
              <span className="font-semibold text-foreground">Status:</span>{" "}
              <span className="uppercase font-bold text-emerald-700">{result.status}</span>
            </div>
            {result.completed_at && (
              <div>
                <span className="font-semibold text-foreground">Completed At:</span>{" "}
                <span>{new Date(result.completed_at).toLocaleString()}</span>
              </div>
            )}
            {result.requested_at && (
              <div>
                <span className="font-semibold text-foreground">Requested At:</span>{" "}
                <span>{new Date(result.requested_at).toLocaleString()}</span>
              </div>
            )}
          </div>
          {result.message && (
            <p className="text-emerald-900/90 pt-1 font-medium">{result.message}</p>
          )}
        </div>
      )}

      {/* Error / Not Found Display */}
      {error && searched && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 space-y-1 text-xs text-destructive flex items-start gap-2.5">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Please double check the confirmation code from your Meta settings or contact support at support@rawreply.com.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
