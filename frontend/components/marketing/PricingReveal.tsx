"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-triggered entrance used across the pricing page. Distinct from
 * the Atelier page's `Reveal` (marketing-v3) — this one is tuned to feel
 * springy and welcoming rather than editorial, per CLAUDE.md's "feel like
 * a friendly wave hello" motion brief.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers its direct children in on scroll — used for card grids. */
export function StaggerGroup({
  children,
  className = "",
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: shouldReduceMotion ? 0 : stagger },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: shouldReduceMotion ? {} : { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A springy "crease" divider that presses into place when it scrolls into view. */
export function PressedCrease({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`pf-crease ${className}`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-40px" }}
      onViewportEnter={(entry) => {
        (entry?.target as HTMLElement | undefined)?.classList.add("is-pressed");
      }}
      variants={{ hidden: {}, shown: {} }}
      aria-hidden="true"
    />
  );
}

export const SPRING = { type: "spring" as const, stiffness: 300, damping: 20 };
