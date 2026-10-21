"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { buttonStyles } from "@/src/components/ui";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import Image from "next/image";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const { accessToken, isHydrated } = useAuthStore();
  const isAuthenticated = !!accessToken;

  return (
    <div className="mobile-safe-top sticky top-0 z-40 border-b border-crease/70 bg-paper/92 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[72px] sm:px-6">
        <Link
          href="/"
          className="flex items-center font-display text-base font-bold tracking-tight text-navy"
        >
          <Image
            src="/icon-mark.png"
            alt="Wedemboyz Lavomatique logo"
            width={32}
            height={50}
            className="h-10 w-auto shrink-0 object-contain sm:h-11"
            priority
          />
          Wedemboyz Lavomatique
        </Link>
        <div className="font-display hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <Link href="/book" className="transition-colors hover:text-ink">
            Book a pickup
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-ink">
            Pricing
          </Link>
          <Link href="/contact" className="transition-colors hover:text-ink">
            Contact
          </Link>
        </div>

        <div className="font-display hidden items-center justify-end gap-3 md:flex">
          {isHydrated && isAuthenticated ? (
            <Link href="/dashboard">
              <span className={buttonStyles({ variant: "gold" })}>
                Dashboard
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Log in
              </Link>

              <Link href="/register">
                <span className={buttonStyles()}>Get started</span>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 h-[calc(100dvh-4rem-env(safe-area-inset-top))] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 sm:h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] md:hidden">
          <div className="font-display flex h-full flex-col text-ink-muted">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">
              Explore Wedemboyz Lavomatique
            </p>
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              Book a pickup
              <ArrowRight className="h-5 w-5 text-gold" />
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              Pricing
              <ArrowRight className="h-5 w-5 text-gold" />
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              Contact
              <ArrowRight className="h-5 w-5 text-gold" />
            </Link>
            <div className="mt-auto grid gap-3 pt-8">
              {isHydrated && isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={buttonStyles({
                    variant: "gold",
                    className: "min-h-12 w-full",
                  })}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({ className: "min-h-12 w-full" })}
                  >
                    Get started
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({
                      variant: "secondary",
                      className: "min-h-12 w-full",
                    })}
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
