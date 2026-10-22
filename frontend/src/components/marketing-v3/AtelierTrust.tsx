"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Reveal } from "./Reveal";

export function AtelierTrust() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  const testimonials = [
    {
      quote: t("marketing.quote1Text"),
      name: t("marketing.quote1Author"),
      context: t("marketing.quote1Context"),
    },
    {
      quote: t("marketing.quote2Text"),
      name: t("marketing.quote2Author"),
      context: t("marketing.quote2Context"),
    },
    {
      quote: t("marketing.quote3Text"),
      name: t("marketing.quote3Author"),
      context: t("marketing.quote3Context"),
    },
  ];

  return (
    <section className="border-t border-[var(--at-line)] px-4 py-14 sm:px-6 sm:py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-xl">
          <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
            {t("marketing.trustEyebrow")}
          </span>
          <h2 className="at-display mt-2 text-2xl font-bold leading-tight text-[var(--at-ivory)] sm:mt-3 sm:text-3xl md:text-4xl">
            {t("marketing.trustTitle")}
          </h2>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-7 sm:mt-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[var(--at-line)]">
          {testimonials.map((item, i) => (
            <Reveal
              key={item.name}
              delay={i * 0.1}
              className="md:px-9 first:md:pl-0 last:md:pr-0"
            >
              <motion.figure
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <span className="at-display block text-3xl leading-none text-[var(--at-brass)]/50 sm:text-5xl">
                  &ldquo;
                </span>
                <blockquote className="mt-1 text-sm leading-6 text-[var(--at-ivory)] sm:mt-2 sm:text-lg sm:leading-relaxed">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-3 border-t border-[var(--at-line)] pt-3 sm:mt-6 sm:pt-4">
                  <p className="at-display text-sm font-semibold text-[var(--at-ivory)]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--at-slate)]">
                    {item.context}
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
