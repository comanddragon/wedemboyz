"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Reveal } from "./Reveal";

export function AtelierCta() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-[var(--at-line)] px-6 py-24 md:py-28">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, var(--color-navy) 35%, var(--color-gold) 65%, transparent)",
        }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
          Ready when you are
        </span>
        <h2 className="at-display mt-4 text-3xl font-bold leading-tight text-[var(--at-ivory)] md:text-5xl">
          Hand it over. We&apos;ll take it from here.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--at-slate)]">
          Reserve your first pickup today. Most orders are weighed, cleaned,
          and returned within 48 hours.
        </p>
        <div className="mt-9 flex justify-center">
          <Link
            href="/register"
            className="at-focus at-btn-primary group inline-flex items-center gap-2 rounded-sm px-8 py-4 text-sm font-semibold uppercase tracking-wider transition-colors"
          >
            Schedule a pickup
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
