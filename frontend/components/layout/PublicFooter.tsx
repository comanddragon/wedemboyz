import Link from "next/link";
import Image from "next/image";

import { BUSINESS } from "@/lib/constants";

function LogoMark() {
    return (
        <Image style={{ width: "auto", height: "auto"}} src="/icon-mark.png" alt="" width={44} height={54} priority />
    );
}
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
  return (
    <footer className="border-t border-crease px-6 py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
            <Link href="/" aria-label="WEDEMBOYZ"  className="flex items-center font-display text-base font-bold tracking-tight text-navy">
                <LogoMark />
                WEDEMBOYZ
            </Link>

          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
            Pickup-and-delivery garment care for Yaoundé. Wash, press, or dry-clean — collected and
            returned to your door.
          </p>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Site</p>
          <nav className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <Link href="/pricing" className="transition-colors hover:text-ink">
              Pricing
            </Link>
            <Link href="/contact" className="transition-colors hover:text-ink">
              Contact
            </Link>
          </nav>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">
            Reach us
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <span>hello@wedemboyz.example</span>
            <a href={BUSINESS.telHref} className="transition-colors hover:text-ink">
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Hours</p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-muted">
            <span>{BUSINESS.hours}</span>
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
              {BUSINESS.address}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-crease pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; {new Date().getFullYear()} WEDEMBOYZ Lavomatique. All rights reserved.</span>
        <span>Cash · MTN Mobile Money · Orange Money</span>
      </div>
    </footer>
  );
}
