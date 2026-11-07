"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, Activity, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_BOTTOM_ITEMS = [
  {
    title: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Orgs",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    title: "Logs",
    href: "/admin/activity",
    icon: Activity,
  },
];

export function AdminBottomNav({ onOpenMore }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile admin navigation bar"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-md lg:hidden"
    >
      {ADMIN_BOTTOM_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary-accent font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("size-5 mb-0.5", isActive ? "text-primary-accent" : "text-muted-foreground")} />
            <span>{item.title}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open complete admin menu"
      >
        <Menu className="size-5 mb-0.5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}

