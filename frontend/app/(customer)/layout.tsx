import React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CustomerNav } from "@/components/layout/CustomerNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="flex min-h-screen">
                <CustomerNav />

                <main className="h-screen flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}