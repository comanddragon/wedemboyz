"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CircleAlert } from "lucide-react";

/** Form-level error banner, shown once at the top of the form. Announced via aria-live so screen reader users hear it without moving focus. */
export function FormErrorBanner({ message }: { message: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      initial={shouldReduceMotion ? undefined : { opacity: 0, x: 0 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-4 flex items-start gap-2 rounded-md bg-status-cancelled-bg px-3 py-2.5 text-sm text-status-cancelled-text"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </motion.div>
  );
}
