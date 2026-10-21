"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useAuthStore } from "@/src/lib/stores/auth.store";

/** Shown to guest sessions: their orders are only tied to this browser until they register. */
export function GuestBanner() {
  const isGuest = useAuthStore((state) => Boolean(state.user?.is_guest));
  if (!isGuest) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gold-50 px-4 py-2 text-center text-xs text-navy">
      <span>
        You&apos;re booking as a guest — your orders are saved on this device
        only.
      </span>
      <Link
        href="/register"
        className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
      >
        Create an account to keep them
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
