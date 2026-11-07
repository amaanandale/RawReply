"use client";

import * as React from "react";
import { UserCheck, ShieldAlert, RefreshCw, Loader2, Phone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminLeadsPage() {
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadLeads() {
      try {
        const res = await fetch("/api/admin/leads");
        if (!res.ok) throw new Error("Failed to load lead statistics.");
        const data = await res.json();
        if (!ignore) {
          setLeads(data.leads || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadLeads();

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
            Platform Qualified Leads
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-workspace verified lead collection statistics.
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

      {/* Core Business Rule Notice */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary-accent/10 p-2 text-primary-accent shrink-0 mt-0.5">
            <Phone className="size-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Phone Number Qualification Rule Enforced
              </h2>
              <Badge variant="outline" className="text-[10px] text-primary-accent border-primary-accent/30">
                Permanent Policy
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              RawReply strictly refuses to persist unqualified Instagram commenters or store unnecessary chat sessions. A lead record is generated <strong>only</strong> when a user affirmatively submits a valid phone number during an automated requirement conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Leads List */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCheck className="size-4 text-emerald-600" />
            Verified Qualified Leads ({leads.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Customers with submitted phone numbers exported to spreadsheet destinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Verifying lead records...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-muted p-3 text-muted-foreground">
                <UserCheck className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No Qualified Leads Yet
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                As commenters complete requirement sequences and submit valid phone numbers, their verified records will appear across tenant workspaces.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leads.map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{lead.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{lead.phoneNumber}</p>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                    Phone Verified
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
