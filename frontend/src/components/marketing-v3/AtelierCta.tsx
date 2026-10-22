"use client";

import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { useI18n } from "@/src/i18n/I18nProvider";
import { Reveal } from "./Reveal";

export function AtelierCta() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-t border-[var(--at-line)] px-4 py-14 sm:px-6 sm:py-20 md:py-28">
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
          {t("marketing.ctaEyebrow")}
        </span>
        <h2 className="at-display mt-2 text-2xl font-bold leading-tight text-[var(--at-ivory)] sm:mt-4 sm:text-3xl md:text-5xl">
          {t("marketing.ctaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--at-slate)] sm:mt-5 sm:text-base sm:leading-relaxed">
          {t("marketing.ctaDescription")}
        </p>
        <div className="mt-5 flex justify-center sm:mt-9">
          <Link
            href="/register"
            className="at-focus at-btn-primary group inline-flex min-h-11 items-center gap-2 rounded-sm px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors sm:px-8 sm:py-4 sm:text-sm"
          >
            {t("marketing.schedulePickup")}
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
