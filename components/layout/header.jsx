"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronRight,
  User,
  Users,
  LogOut,
  Building,
  Check,
  ChevronDown,
  Plus,
  Shield,
} from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shared/auth-provider";

export function DashboardHeader({ onToggleSidebar }) {
  const pathname = usePathname();
  const { user, organization, organizations, role, switchOrganization, logout } = useAuth();

  const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [creatingOrg, setCreatingOrg] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState("");

  const orgRef = React.useRef(null);
  const userRef = React.useRef(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (orgRef.current && !orgRef.current.contains(event.target)) {
        setOrgDropdownOpen(false);
        setCreatingOrg(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentItem = DASHBOARD_NAV_ITEMS.find((item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`)
  );

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewOrgName("");
        setCreatingOrg(false);
        setOrgDropdownOpen(false);
        await switchOrganization(data.organization.id);
      }
    } catch (err) {
      console.error("Failed to create organization:", err);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-4" />
        </Button>

        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors hidden sm:inline"
          >
            Dashboard
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60 hidden sm:inline" />
          <span className="font-semibold text-foreground">
            {currentItem?.title || "Overview"}
          </span>
        </div>
      </div>

      {/* Right: Super Admin Switcher, Organization Switcher & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user?.isSuperAdmin && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-primary-accent/40 bg-primary-accent/10 text-primary-accent hover:bg-primary-accent/20 text-xs font-semibold h-8 px-2.5 shadow-2xs"
          >
            <Link href="/admin">
              <Shield className="size-3.5 mr-1 text-primary-accent" />
              <span>Back to Super Admin</span>
            </Link>
          </Button>
        )}

        {user ? (
          <>
            {/* Custom Organization Switcher */}
            <div className="relative" ref={orgRef}>
              <button
                type="button"
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                aria-expanded={orgDropdownOpen}
              >
                <Building className="size-3.5 text-primary-accent" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate">
                  {organization?.name || "Select Workspace"}
                </span>
                <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-md border border-border bg-popover p-1 shadow-md z-50 text-xs">
                  <div className="px-2 py-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                    Workspaces
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {organizations.map((org) => {
                      const isCurrent = org.id === organization?.id;
                      return (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            switchOrganization(org.id);
                            setOrgDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                            isCurrent
                              ? "bg-primary-accent/10 font-semibold text-primary-accent"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building className="size-3.5 shrink-0" />
                            <span className="truncate">{org.name}</span>
                          </div>
                          {isCurrent && <Check className="size-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-border mt-1 pt-1">
                    {creatingOrg ? (
                      <form onSubmit={handleCreateOrg} className="p-1 space-y-1.5">
                        <input
                          type="text"
                          required
                          placeholder="Workspace name..."
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                          autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setCreatingOrg(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="h-6 text-[10px] px-2 bg-primary-accent hover:bg-primary-accent-hover text-white"
                          >
                            Create
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCreatingOrg(true)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted text-left transition-colors"
                      >
                        <Plus className="size-3.5" />
                        <span>Create new workspace</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom User Profile Menu */}
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center justify-center size-8 rounded-full bg-primary-accent text-white font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity"
                aria-label="User profile menu"
                aria-expanded={userDropdownOpen}
              >
                {getInitials(user.name)}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-popover p-1 shadow-md z-50 text-xs">
                  <div className="px-2.5 py-2 border-b border-border">
                    <p className="font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0">
                        {typeof role === "object" ? role?.name || "member" : String(role || "member")}
                      </Badge>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard/team"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-muted transition-colors"
                    >
                      <Users className="size-3.5 text-muted-foreground" />
                      <span>Team Members</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="size-3.5" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" className="flex items-center gap-1.5 text-xs">
                <User className="size-3.5" />
                <span>Sign in</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
