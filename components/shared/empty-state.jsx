import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard RawReply empty state component matching design.md:
 * - Centered layout
 * - Lucide icon at 48px, color var(--gray-300)
 * - Heading: h3 style, color var(--gray-700)
 * - Description: body-sm style, color var(--gray-500)
 * - Optional CTA button below
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center size-12 rounded-full bg-muted/60 mb-4 text-muted-foreground/60">
          <Icon className="size-6 text-muted-foreground/70" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

