"use client";

import * as React from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { AdminBottomNav } from "@/components/admin/bottom-nav";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Super Admin Navigation Drawer */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Admin Column */}
      <div className="flex flex-col lg:pl-64">
        {/* Header */}
        <AdminHeader
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Content Area - pb-24 on mobile ensures clearance above bottom navigation */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile-First Bottom Navigation for Admins */}
      <AdminBottomNav onOpenMore={() => setSidebarOpen(true)} />
    </div>
  );
}

