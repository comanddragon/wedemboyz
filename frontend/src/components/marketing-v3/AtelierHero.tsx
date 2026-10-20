"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function AtelierHero() {
  const shouldReduceMotion = useReducedMotion();

  const stagger = (i: number) => ({
    initial: shouldReduceMotion ? undefined : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.85, delay: 0.15 + i * 0.12, ease: EASE },
  });

  return (
    <section className="relative overflow-hidden border-b border-[var(--at-line)] px-4 pb-10 pt-7 sm:px-6 sm:pb-20 sm:pt-14 md:min-h-[700px] md:pb-24 md:pt-20">
      <Image
        src="/images/pricing-laundromat-interior.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,13,28,0.98)_0%,rgba(6,13,28,0.94)_43%,rgba(6,13,28,0.42)_72%,rgba(6,13,28,0.28)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(6,13,28,0.82)_0%,transparent_55%)] md:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--at-line-strong)] to-transparent"
      />

      <div className="relative mx-auto flex max-w-7xl items-center md:min-h-[540px]">
        <div className="max-w-2xl">
          <motion.h1
            {...stagger(0)}
            className="at-display max-w-xl text-[clamp(2.15rem,10vw,4rem)] font-bold leading-[0.98] tracking-[-0.035em] text-[var(--at-ivory)]"
          >
            Garment care,{" "}
            <span className="at-shimmer-text">handled like an art</span>.
          </motion.h1>

          <motion.p
            {...stagger(1)}
            className="mt-4 max-w-md text-[0.84rem] leading-6 text-[var(--at-slate)] sm:mt-6 sm:text-lg sm:leading-relaxed"
          >
            Wedemboyz Lavomatique collects, cleans, and presses your wardrobe with the
            discipline of a proper atelier — then returns it to your door. No
            storefront queue, no counter clerk guessing your fabric. Just a
            precise, accountable process, city-wide.
          </motion.p>

          <motion.div
            {...stagger(2)}
            className="mt-5 grid grid-cols-2 gap-2 sm:mt-10 sm:flex sm:flex-wrap sm:items-center sm:gap-4"
          >
            <Link
              href="/book"
              className="at-focus at-btn-primary group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide transition-colors sm:min-h-12 sm:gap-2 sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-wider"
            >
              Schedule a pickup
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/pricing"
              className="at-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-[var(--at-line-strong)] px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--at-ivory)] transition-colors hover:border-[var(--at-brass)] hover:text-[var(--at-brass-bright)] sm:min-h-12 sm:gap-2 sm:px-7 sm:py-3.5 sm:text-sm sm:tracking-wider"
            >
              View the tariff
            </Link>
          </motion.div>

          <motion.dl
            {...stagger(3)}
            className="mt-7 grid max-w-lg grid-cols-3 gap-2 border-t border-[var(--at-line)] pt-4 sm:mt-16 sm:gap-6 sm:pt-8"
          >
            {[
              ["12,000+", "Garments returned"],
              ["48 hrs", "Median turnaround"],
              ["4.8 / 5", "Client rating"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="at-serif-num text-base font-bold text-[var(--at-ivory)] sm:text-2xl">
                  {value}
                </dd>
                <dd className="mt-1 text-[0.7rem] leading-snug text-[var(--at-slate)] sm:text-xs">
                  {label}
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

      </div>
    </section>
  );
}
