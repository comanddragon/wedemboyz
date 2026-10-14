import { AdminGuard } from "@/src/components/auth/AdminGuard";
import { DashboardNav } from "@/src/components/layout/DashboardNav";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="dashboard-canvas h-dvh overflow-hidden sm:p-4 xl:p-7">
        <div className="dashboard-shell mx-auto flex h-full max-w-[1680px] flex-col overflow-hidden sm:rounded-[28px]">
          <DashboardNav admin />
          <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
