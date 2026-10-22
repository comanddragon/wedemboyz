"use client";

import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { buttonStyles } from "@/src/components/ui";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import Image from "next/image";
import { BUSINESS } from "@/src/lib/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/src/i18n/I18nProvider";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#25D366" d="M12.04 2a9.84 9.84 0 0 0-8.42 14.92L2.05 22l5.2-1.53A9.94 9.94 0 1 0 12.04 2Zm0 17.98a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.08.91.92-3-.2-.31A8.1 8.1 0 1 1 12.04 20Zm4.45-6.07c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.25-.63.79-.77.95-.14.17-.28.19-.53.07-.24-.12-1.03-.38-1.96-1.21a7.33 7.33 0 0 1-1.36-1.69c-.14-.24-.01-.37.11-.5.11-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.65.3-.22.25-.85.83-.85 2.03 0 1.19.87 2.34.99 2.5.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.44-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

export function PublicNav() {
  const { t } = useI18n();
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
            {t("publicNav.book")}
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-ink">
            {t("publicNav.pricing")}
          </Link>
          <Link href="/contact" className="transition-colors hover:text-ink">
            {t("publicNav.contact")}
          </Link>
        </div>

        <div className="font-display hidden items-center justify-end gap-3 md:flex">
          <LanguageSwitcher compact />
          <a
            href={BUSINESS.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-10 w-10 place-items-center rounded-full border border-crease bg-white transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
            aria-label={t("publicNav.whatsapp")}
          >
            <WhatsAppIcon className="h-[22px] w-[22px]" />
          </a>
          {isHydrated && isAuthenticated ? (
            <Link href="/dashboard">
              <span className={buttonStyles({ variant: "gold" })}>
                {t("publicNav.dashboard")}
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-ink-muted hover:text-ink"
              >
                {t("publicNav.login")}
              </Link>

              <Link href="/register">
                <span className={buttonStyles()}>{t("publicNav.start")}</span>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <a
            href={BUSINESS.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 w-11 place-items-center rounded-full border border-crease bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
            aria-label={t("publicNav.whatsapp")}
          >
            <WhatsAppIcon className="h-6 w-6" />
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("publicNav.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 h-[calc(100dvh-4rem-env(safe-area-inset-top))] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 sm:h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] md:hidden">
          <div className="font-display flex h-full flex-col text-ink-muted">
            <div className="mb-5"><LanguageSwitcher /></div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">
              Explore Wedemboyz Lavomatique
            </p>
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              {t("publicNav.book")}
              <ArrowRight className="h-5 w-5 text-gold" />
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              {t("publicNav.pricing")}
              <ArrowRight className="h-5 w-5 text-gold" />
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex min-h-16 items-center justify-between border-b border-crease text-2xl font-medium text-navy"
            >
              {t("publicNav.contact")}
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
                  {t("publicNav.dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({ className: "min-h-12 w-full" })}
                  >
                    {t("publicNav.start")}
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={buttonStyles({
                      variant: "secondary",
                      className: "min-h-12 w-full",
                    })}
                  >
                    {t("publicNav.login")}
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
