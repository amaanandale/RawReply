"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronRight,
  Shield,
  LogOut,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { ADMIN_NAV_ITEMS } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shared/auth-provider";

export function AdminHeader({ onToggleSidebar }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentItem = ADMIN_NAV_ITEMS.find((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`)
  );

  const getInitials = (name) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden min-h-[44px] min-w-[44px]"
          onClick={onToggleSidebar}
          aria-label="Toggle admin navigation menu"
        >
          <Menu className="size-4" />
        </Button>

        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors hidden sm:inline"
          >
            Admin
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60 hidden sm:inline" />
          <span className="font-semibold text-foreground">
            {currentItem?.title || "Control Plane"}
          </span>
        </div>
      </div>

      {/* Right: Super Admin Pill, Customer Dashboard Link & User Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-foreground border-border hover:bg-muted"
        >
          <Link href="/dashboard">
            <LayoutDashboard className="size-3.5" />
            <span>Customer Dashboard</span>
          </Link>
        </Button>

        <Badge
          variant="outline"
          className="hidden sm:inline-flex items-center gap-1.5 border-primary-accent/30 bg-primary-accent/10 text-primary-accent font-semibold text-[11px]"
        >
          <Shield className="size-3" />
          <span>Platform Super Admin</span>
        </Badge>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center size-8 rounded-full bg-primary-accent text-white font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
            aria-label="Super Admin profile menu"
            aria-expanded={dropdownOpen}
          >
            {getInitials(user?.name)}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-md border border-border bg-popover p-1 shadow-md z-50 text-xs">
              <div className="px-2.5 py-2 border-b border-border">
                <p className="font-semibold text-foreground truncate">{user?.name || "Super Admin"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] font-bold text-primary-accent border-primary-accent/30 uppercase">
                    Super Admin
                  </Badge>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded text-foreground hover:bg-muted transition-colors min-h-[44px] sm:min-h-[32px]"
                >
                  <LayoutDashboard className="size-3.5 text-muted-foreground" />
                  <span>Customer Dashboard</span>
                  <ExternalLink className="size-3 text-muted-foreground ml-auto" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-destructive hover:bg-destructive/10 transition-colors text-left min-h-[44px] sm:min-h-[32px]"
                >
                  <LogOut className="size-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

