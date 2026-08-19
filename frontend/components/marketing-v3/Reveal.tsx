"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE_EDITORIAL = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className = "",
  y = 20,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: EASE_EDITORIAL }}
    >
      {children}
    </motion.div>
  );
}

/** The page's signature device: a hairline that draws itself in from the
 * center outward once scrolled into view, standing in for the site's
 * playful "crease" motif with something quieter and more deliberate. */
export function ThreadDivider({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`at-thread h-px w-full bg-[var(--at-line)] ${className}`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        shown: {},
      }}
      onViewportEnter={(entry) => {
        const el = entry?.target as HTMLElement | undefined;
        el?.classList.add("is-drawn");
      }}
    />
  );
}
