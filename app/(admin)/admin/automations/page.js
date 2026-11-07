"use client";

import * as React from "react";
import { Zap, AlertCircle, RefreshCw, Loader2, Bot } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminAutomationsPage() {
  const [automations, setAutomations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [refreshIndex, setRefreshIndex] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;

    async function loadAutomations() {
      try {
        const res = await fetch("/api/admin/automations");
        if (!res.ok) throw new Error("Failed to load automations.");
        const data = await res.json();
        if (!ignore) {
          setAutomations(data.automations || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadAutomations();

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
            Platform Automations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor Instagram comment-to-DM automated sequences configured across customer workspaces.
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

      {/* Automations Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="size-4 text-primary-accent" />
            Configured Automations ({automations.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Automations execute exclusively when an eligible comment triggers a DM sequence.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary-accent mb-2" />
              <span>Loading automations...</span>
            </div>
          ) : automations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="rounded-full bg-primary-accent/10 p-3 text-primary-accent">
                <Bot className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No Workspace Automations Active
              </h3>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Customer workspaces have not activated any automated comment-to-DM triggers yet. As customers connect Instagram Business accounts and build requirement sequences, their workflows will register here.
              </p>
              <div className="pt-2">
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  State: Zero Active Automations
                </Badge>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {automations.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">Org: {a.organizationName}</p>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
