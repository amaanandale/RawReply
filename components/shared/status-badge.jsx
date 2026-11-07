import * as React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Standard status badge for various entities across the SaaS dashboard
 */
export function StatusBadge({ status, label }) {
  switch (status) {
    case "connected":
    case "active":
    case "exported":
    case "qualified":
      return (
        <Badge variant="success">
          <span className="mr-1.5 size-1.5 rounded-full bg-emerald-600 inline-block" />
          {label || status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    case "not_connected":
    case "disconnected":
    case "inactive":
    case "unqualified":
      return (
        <Badge variant="muted">
          <span className="mr-1.5 size-1.5 rounded-full bg-slate-400 inline-block" />
          {label || "Not Connected"}
        </Badge>
      );
    case "paused":
    case "draft":
    case "pending":
      return (
        <Badge variant="warning">
          <span className="mr-1.5 size-1.5 rounded-full bg-amber-500 inline-block" />
          {label || status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    case "coming_soon":
      return (
        <Badge variant="accent">
          <span className="mr-1.5 size-1.5 rounded-full bg-blue-500 inline-block" />
          {label || "Coming Soon"}
        </Badge>
      );
    case "error":
    case "failed":
      return (
        <Badge variant="destructive">
          <span className="mr-1.5 size-1.5 rounded-full bg-red-600 inline-block" />
          {label || "Failed"}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {label || status}
        </Badge>
      );
  }
}

