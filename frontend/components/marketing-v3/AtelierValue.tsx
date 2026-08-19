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
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 py-24 md:grid-cols-[0.85fr_1.15fr] md:py-28">
      <Reveal>
        <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
          Why clients stay
        </span>
        <h2 className="at-display mt-3 text-3xl font-bold leading-[1.1] text-[var(--at-ivory)] md:text-4xl">
          A service run like a ledger, not a favor.
        </h2>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-[var(--at-slate)]">
          We built WEDEMBOYZ around a simple conviction: laundry deserves the
          same rigor as any professional service — clear pricing, a
          documented chain of custody, and a schedule you can plan around.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-[var(--at-line)]">
        {PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <Reveal key={pillar.title} delay={i * 0.1}>
              <div className="flex gap-6 bg-[var(--at-ink)] p-7 md:p-9">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="at-display text-lg font-bold text-[var(--at-ivory)]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--at-slate)]">
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
