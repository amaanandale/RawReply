"use client";

import * as React from "react";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/bottom-nav";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-muted/20">
      <React.Suspense fallback={null}>
        {/* Sidebar / Mobile Navigation Drawer */}
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Column */}
        <div className="flex flex-col lg:pl-60">
          {/* Header */}
          <DashboardHeader
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />

          {/* Content Area - pb-24 on mobile ensures clearance above bottom navigation */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile-First Bottom Navigation (390px viewport primary benchmark) */}
        <MobileBottomNav onOpenMore={() => setSidebarOpen(true)} />
      </React.Suspense>
    </div>
  );
}
