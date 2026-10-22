"use client";

import { LogOut } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/src/lib/utils";
import { useI18n } from "@/src/i18n/I18nProvider";

const BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-steam hover:text-status-cancelled-text disabled:cursor-not-allowed disabled:opacity-50";

export function LogoutButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { logout, isLoggingOut, isAuthenticated, isGuest } = useAuth();

  // A visitor booking without an account has nothing to log out of.
  if (!isAuthenticated) {
    return (
      <Link href="/login" className={cn(BUTTON_CLASS, className)}>
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("auth.login")}
      </Link>
    );
  }

  async function handleClick() {
    // A guest has no password: logging out drops the only key to their orders.
    if (
      isGuest &&
      !window.confirm(
        t("auth.guestLogout"),
      )
    ) {
      return;
    }
    await logout();
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoggingOut}
      className={cn(BUTTON_CLASS, className)}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      {isLoggingOut ? t("auth.loggingOut") : t("auth.logout")}
    </button>
  );
}
