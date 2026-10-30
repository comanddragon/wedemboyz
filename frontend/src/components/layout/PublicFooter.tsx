"use client";

import { LocalizedLink as Link } from "@/src/i18n/navigation";
import Image from "next/image";

import { BUSINESS } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

/**
 * The one global footer, rendered by SiteShell on every route (including
 * the homepage). Uses the site's real Fold Line tokens (text-navy,
 * border-crease, etc.) — this used to be a copy-paste of the now-deleted
 * AtelierFooter that kept its `var(--at-*)` custom properties, which only
 * ever existed inside an `.atelier` ancestor. Rendered anywhere else
 * (i.e. everywhere SiteShell puts it), those variables were undefined,
 * which is why this footer "looked different" once it was wired into
 * SiteShell — it wasn't reskinned, it was unstyled.
 */
export function PublicFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-crease px-6 py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            aria-label="Wedemboyz Lavomatique"
            className="inline-block transition-opacity hover:opacity-95"
          >
            <Image
              src="/logo.png"
              alt="Wedemboyz Lavomatique"
              width={216}
              height={80}
              className="h-11 w-auto object-contain sm:h-12"
              priority
            />
          </Link>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            {t("footer.description")}
          </p>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            {t("footer.site")}
          </p>
          <nav className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <Link href="/pricing" className="transition-colors hover:text-ink">
              {t("publicNav.pricing")}
            </Link>
            <Link href="/contact" className="transition-colors hover:text-ink">
              {t("publicNav.contact")}
            </Link>
          </nav>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            {t("footer.reach")}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <a
              href={BUSINESS.telHref}
              className="transition-colors hover:text-ink"
            >
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            {t("footer.hours")}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <span>{BUSINESS.hours}</span>
            <a
              href={BUSINESS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              {BUSINESS.address}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-crease pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          &copy; {new Date().getFullYear()} Wedemboyz Lavomatique. {t("footer.rights")}
        </span>
        <span>{t("paymentOptions.pickup")} · {t("paymentOptions.delivery")}</span>
      </div>
    </footer>
  );
}
