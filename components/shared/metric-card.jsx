import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Metric card for the dashboard overview.
 * Displays metric title, numeric value, icon, and contextual indicator.
 * Does NOT display fake percentage changes or fake trends.
 */
export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  className,
}) {
  return (
    <Card className={cn("overflow-hidden border border-border bg-card", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="flex size-8 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
              <Icon className="size-4" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </span>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

