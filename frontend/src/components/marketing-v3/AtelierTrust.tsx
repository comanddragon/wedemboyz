"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Reveal } from "./Reveal";

const TESTIMONIALS = [
  {
    quote:
      "I stopped ironing my own shirts the day I found WEDEMBOYZ. Pickup has been on time every week for a year.",
    name: "Aïcha M.",
    context: "Bastos — Wash & press, weekly",
  },
  {
    quote:
      "Paid by Orange Money at the door, no back and forth. My suit came back better pressed than the tailor manages.",
    name: "Bertrand K.",
    context: "Mvog-Mbi — Dry clean",
  },
  {
    quote:
      "Booked at 9am, clothes were back by evening. I didn't think that turnaround existed here.",
    name: "Solange T.",
    context: "Nlongkak — Wash & fold",
  },
];

export function AtelierTrust() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-t border-[var(--at-line)] px-6 py-24 md:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-xl">
          <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
            On the record
          </span>
          <h2 className="at-display mt-3 text-3xl font-bold leading-tight text-[var(--at-ivory)] md:text-4xl">
            What clients across Yaoundé are saying.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[var(--at-line)]">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1} className="md:px-9 first:md:pl-0 last:md:pr-0">
              <motion.figure
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <span className="at-display block text-5xl leading-none text-[var(--at-brass)]/50">
                  &ldquo;
                </span>
                <blockquote className="mt-2 text-lg leading-relaxed text-[var(--at-ivory)]">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-[var(--at-line)] pt-4">
                  <p className="at-display text-sm font-semibold text-[var(--at-ivory)]">
                    {t.name}
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--at-slate)]">
                    {t.context}
                  </p>
                </figcaption>
              </motion.figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
