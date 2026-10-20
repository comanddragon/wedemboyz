"use client";

import { Banknote, ShieldCheck, Timer } from "lucide-react";

import { Reveal } from "./Reveal";

const PILLARS = [
  {
    icon: Timer,
    title: "Same-day collection",
    description:
      "Book before noon in most Yaoundé neighborhoods and a runner is at your door that afternoon. No appointment window measured in days.",
  },
  {
    icon: ShieldCheck,
    title: "Every item accounted for",
    description:
      "Weighed in front of you, tagged against your order, checked back against the same ticket at delivery. Nothing is estimated after the fact.",
  },
  {
    icon: Banknote,
    title: "Settle however suits you",
    description:
      "Cash, MTN Mobile Money, or Orange Money — confirmed at the door, no card required and no balance carried forward.",
  },
];

export function AtelierValue() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 md:grid-cols-[0.85fr_1.15fr] md:gap-16 md:py-28">
      <Reveal>
        <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
          Why clients stay
        </span>
        <h2 className="at-display mt-2 text-2xl font-bold leading-[1.1] text-[var(--at-ivory)] sm:mt-3 sm:text-3xl md:text-4xl">
          A service run like a ledger, not a favor.
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--at-slate)] sm:mt-5 sm:text-base sm:leading-relaxed">
          We built Wedemboyz Lavomatique around a simple conviction: laundry deserves the
          same rigor as any professional service — clear pricing, a documented
          chain of custody, and a schedule you can plan around.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-[var(--at-line)]">
        {PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <Reveal key={pillar.title} delay={i * 0.1}>
              <div className="flex gap-3 bg-[var(--at-ink)] p-4 sm:gap-6 sm:p-7 md:p-9">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="at-display text-sm font-bold text-[var(--at-ivory)] sm:text-lg">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 max-w-lg text-xs leading-5 text-[var(--at-slate)] sm:mt-2 sm:text-sm sm:leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
