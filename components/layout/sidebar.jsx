"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/config/navigation";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DashboardSidebar({ isOpen, onClose }) {
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
          "fixed top-0 bottom-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight hover:opacity-90"
            onClick={onClose}
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <MessageCircle className="size-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">{APP_NAME}</span>
          </Link>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            SaaS
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Menu
          </div>
          <nav className="flex flex-col gap-1">
            {DASHBOARD_NAV_ITEMS.map((item) => {
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
                    "flex h-9 items-center gap-3 rounded-md px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary-accent-light text-primary-accent font-semibold"
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

        {/* Meta / Compliance Note */}
        <div className="border-t border-border p-3">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-foreground text-xs font-semibold">
              <ShieldCheck className="size-3.5 text-primary-accent" />
              <span>Meta 24h Window</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Automated responses strictly adhere to Instagram Graph API messaging guidelines.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

