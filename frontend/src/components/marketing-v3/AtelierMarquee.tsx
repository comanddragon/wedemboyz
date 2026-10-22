"use client";

import { useI18n } from "@/src/i18n/I18nProvider";
import { messages } from "@/src/i18n/messages";

/**
 * A quiet ledger-strip rather than a loud candy marquee — small caps,
 * generous tracking, thin brass rule above and below. States the
 * operating standard, not a mood.
 */
export function AtelierMarquee() {
  const { locale } = useI18n();
  const words = messages[locale]?.marketing?.marqueeWords ?? messages.fr.marketing.marqueeWords;
  const items = [...words, ...words];
  return (
    <div className="border-y border-[var(--at-line)] bg-[var(--at-panel)] py-5">
      <div className="overflow-hidden whitespace-nowrap" aria-hidden="true">
        <div className="at-marquee-track inline-block">
          {items.map((word, i) => (
            <span
              key={i}
              className="at-display mx-8 inline-flex items-center gap-8 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-slate)]"
            >
              {word}
              <span className="text-[var(--at-brass)]">&#9670;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
