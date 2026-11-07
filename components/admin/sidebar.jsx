"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Zap,
  UserCheck,
  Activity,
  Settings,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
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
    title: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    title: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Automations",
    href: "/admin/automations",
    icon: Zap,
  },
  {
    title: "Instagram Accounts",
    href: "/admin/integrations",
    icon: Instagram,
  },
  {
    title: "Qualified Leads",
    href: "/admin/leads",
    icon: UserCheck,
  },
  {
    title: "System Activity",
    href: "/admin/activity",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close mobile sidebar backdrop"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") onClose();
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5 bg-muted/20">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight hover:opacity-90"
            onClick={onClose}
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary-accent text-white shadow-xs">
              <Shield className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none tracking-tight">RawReply</span>
              <span className="text-[10px] text-muted-foreground font-medium">Control Plane</span>
            </div>
          </Link>
          <span className="rounded bg-primary-accent/10 px-2 py-0.5 text-[10px] font-bold text-primary-accent uppercase tracking-wider">
            Admin
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Platform Management
          </div>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-md px-3 text-xs font-medium transition-colors min-h-[44px] sm:min-h-[36px]",
                    isActive
                      ? "bg-primary-accent/10 text-primary-accent font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      isActive ? "text-primary-accent" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Customer Portal Link & Role Note */}
        <div className="border-t border-border p-3 space-y-2 bg-muted/10">
          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors border border-border"
          >
            <span>Customer Dashboard</span>
            <ArrowUpRight className="size-3.5 text-muted-foreground" />
          </Link>
          <div className="rounded-md border border-border bg-card p-2.5 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="size-3 text-primary-accent" />
              Platform Owner
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Direct administrative access. All actions are recorded to audit logs.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
