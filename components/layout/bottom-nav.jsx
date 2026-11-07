"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Automations",
    href: "/dashboard/automations",
    icon: Zap,
    exact: false,
  },
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: Users,
    exact: false,
  },
  {
    title: "Accounts",
    href: "/dashboard/accounts",
    icon: Instagram,
    exact: false,
  },
];

export function MobileBottomNav({ onOpenMore }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden shadow-xs"
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[44px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              isActive
                ? "text-primary-accent font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-5 shrink-0 transition-transform",
                isActive && "scale-110 text-primary-accent"
              )}
            />
            <span className="leading-none">{item.title}</span>
          </Link>
        );
      })}

      {/* "More" Trigger (Opens navigation drawer for secondary items) */}
      <button
        type="button"
        onClick={onOpenMore}
        aria-label="More options"
        className="flex min-h-[44px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="size-5 shrink-0" />
        <span className="leading-none">More</span>
      </button>
    </nav>
  );
}
