import React from "react";
import { AuthGuard } from "@/src/components/auth/AuthGuard";
import { DashboardNav } from "@/src/components/layout/DashboardNav";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="dashboard-canvas h-dvh overflow-hidden sm:p-4 xl:p-7">
        <div className="dashboard-shell mx-auto flex h-full max-w-[1680px] flex-col overflow-hidden sm:rounded-[28px]">
          <DashboardNav />
          <main className="dashboard-scroll relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
