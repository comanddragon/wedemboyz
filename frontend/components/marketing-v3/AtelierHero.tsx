"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { GarmentMark } from "./GarmentMark";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AtelierHero() {
  const shouldReduceMotion = useReducedMotion();

  const stagger = (i: number) => ({
    initial: shouldReduceMotion ? undefined : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.85, delay: 0.15 + i * 0.12, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden border-b border-[var(--at-line)] px-6 pb-24 pt-14 md:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(182,137,63,0.10),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(25,38,69,0.14),transparent_50%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--at-line-strong)] to-transparent"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 md:grid-cols-[1.08fr_0.92fr]">
        <div>
          <motion.div {...stagger(0)} className="flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--at-brass)]" />
            <span className="at-display text-xs font-medium uppercase tracking-[0.28em] text-[var(--at-brass-bright)]">
              Établi à Yaoundé — Est. 2021
            </span>
          </motion.div>

          <motion.h1
            {...stagger(1)}
            className="at-display mt-7 max-w-xl text-[2.6rem] font-bold leading-[1.06] tracking-tight text-[var(--at-ivory)] sm:text-6xl"
          >
            Garment care, <span className="at-shimmer-text">handled like an art</span>.
          </motion.h1>

          <motion.p
            {...stagger(2)}
            className="mt-6 max-w-md text-lg leading-relaxed text-[var(--at-slate)]"
          >
            WEDEMBOYZ collects, cleans, and presses your wardrobe with the
            discipline of a proper atelier — then returns it to your door.
            No storefront queue, no counter clerk guessing your fabric. Just a
            precise, accountable process, city-wide.
          </motion.p>

          <motion.div {...stagger(3)} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/book"
              className="at-focus at-btn-primary group inline-flex items-center gap-2 rounded-sm px-7 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors"
            >
              Schedule a pickup
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/pricing"
              className="at-focus inline-flex items-center gap-2 rounded-sm border border-[var(--at-line-strong)] px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-[var(--at-ivory)] transition-colors hover:border-[var(--at-brass)] hover:text-[var(--at-brass-bright)]"
            >
              View the tariff
            </Link>
          </motion.div>

          <motion.dl
            {...stagger(4)}
            className="mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--at-line)] pt-8"
          >
            {[
              ["12,000+", "Garments returned"],
              ["48 hrs", "Median turnaround"],
              ["4.8 / 5", "Client rating"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="at-serif-num text-2xl font-bold text-[var(--at-ivory)]">
                  {value}
                </dd>
                <dd className="mt-1 text-xs leading-snug text-[var(--at-slate)]">{label}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
          className="relative mx-auto w-full max-w-md"
        >
          <GarmentMark className="w-full" />

          {/* A single "specimen plate" from the actual pressing floor — a
              quiet supporting note, deliberately small and captioned like a
              ledger clipping, so it never competes with GarmentMark for
              attention. */}
          <motion.figure
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
            className="absolute bottom-2 left-0 w-[38%] max-w-[168px] sm:bottom-4 sm:left-2"
          >
            <div className="overflow-hidden rounded-sm border border-[var(--at-line-strong)] bg-[var(--at-panel)] p-1 shadow-[0_10px_28px_-14px_rgba(28,26,22,0.35)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2px]">
                <Image
                  src="/images/hero-bagged-shirts.jpg"
                  alt="Pressed shirts sheathed and racked at the WEDEMBOYZ pressing floor"
                  fill
                  sizes="(max-width: 640px) 40vw, 168px"
                  className="object-cover"
                />
              </div>
            </div>
            <figcaption
              className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--at-slate)]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Plate 04 — the pressing floor
            </figcaption>
          </motion.figure>
        </motion.div>
      </div>
    </section>
  );
}
