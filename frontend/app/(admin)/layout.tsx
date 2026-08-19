import { AdminGuard } from "@/components/auth/AdminGuard";
import { AdminNav } from "@/components/layout/AdminNav";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen">
                <AdminNav />
                <main className="h-screen flex-1 overflow-y-auto">{children}</main>
            </div>
        </AdminGuard>
    );
}
