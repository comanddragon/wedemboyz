"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { logout, isLoggingOut } = useAuth();

  async function handleClick() {
    await logout();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoggingOut}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-steam hover:text-status-cancelled-text disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isLoggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}
