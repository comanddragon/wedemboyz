"use client";

import { ArrowRight } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

import { useAuthStore } from "@/src/lib/stores/auth.store";
import { useI18n } from "@/src/i18n/I18nProvider";

/** Shown to guest sessions: their orders are only tied to this browser until they register. */
export function GuestBanner() {
  const { t } = useI18n();
  const isGuest = useAuthStore((state) => Boolean(state.user?.is_guest));
  if (!isGuest) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gold-50 px-4 py-2 text-center text-xs text-navy">
      <span>
        {t("auth.guestBanner")}
      </span>
      <Link
        href="/register"
        className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
      >
        {t("auth.keepOrders")}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
