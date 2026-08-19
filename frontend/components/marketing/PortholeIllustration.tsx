"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The About page's signature element: a washing-machine porthole, rendered
 * as a warm brass ring around a dark glass window with swirling suds and
 * rising bubbles. Where the homepage's FoldStackIllustration is about the
 * folded, finished garment, this is about the moment mid-cycle — literally
 * "looking into the wash" — which is the right image for a page about how
 * the business actually runs day to day.
 */
export function PortholeIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm" role="img" aria-label="Illustration of a washing machine porthole with swirling suds">
      <svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <radialGradient id="ringGrad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--color-gold-light)" />
            <stop offset="45%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-gold-deep)" />
          </radialGradient>
          <radialGradient id="glassGrad" cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#2A4A66" />
            <stop offset="100%" stopColor="#0C1726" />
          </radialGradient>
          <clipPath id="glassClip">
            <circle cx="200" cy="200" r="146" />
          </clipPath>
        </defs>

        {/* outer brass ring */}
        <circle cx="200" cy="200" r="192" fill="url(#ringGrad)" />
        {/* inner navy collar */}
        <circle cx="200" cy="200" r="164" fill="var(--color-navy-deep)" />
        {/* glass */}
        <circle cx="200" cy="200" r="146" fill="url(#glassGrad)" />

        <g clipPath="url(#glassClip)">
          <motion.g
            style={{ transformOrigin: "200px 260px" }}
            initial={shouldReduceMotion ? undefined : { rotate: 0 }}
            animate={shouldReduceMotion ? undefined : { rotate: 360 }}
            transition={
              shouldReduceMotion
                ? undefined
                : { repeat: Infinity, duration: 7, ease: "linear" }
            }
          >
            <ellipse cx="200" cy="330" rx="320" ry="160" fill="var(--color-suds)" opacity="0.55" />
            <circle cx="130" cy="270" r="14" fill="#fff" opacity="0.85" />
            <circle cx="270" cy="255" r="9" fill="#fff" opacity="0.7" />
            <circle cx="220" cy="300" r="11" fill="#fff" opacity="0.75" />
          </motion.g>

          {/* rising bubbles */}
          {[
            { cx: 250, r: 7, delay: 0 },
            { cx: 160, r: 5, delay: 1.4 },
            { cx: 285, r: 4, delay: 2.6 },
            { cx: 190, r: 6, delay: 0.8 },
          ].map((b, i) => (
            <motion.circle
              key={i}
              cx={b.cx}
              r={b.r}
              fill="#ffffff"
              opacity={shouldReduceMotion ? 0.6 : undefined}
              initial={shouldReduceMotion ? undefined : { cy: 320, opacity: 0 }}
              animate={
                shouldReduceMotion
                  ? undefined
                  : { cy: [320, 90], opacity: [0, 0.9, 0] }
              }
              transition={
                shouldReduceMotion
                  ? undefined
                  : {
                      repeat: Infinity,
                      duration: 5,
                      delay: b.delay,
                      ease: "easeInOut",
                    }
              }
            />
          ))}
        </g>

        {/* glass shine */}
        <path
          d="M 90 140 A 146 146 0 0 1 250 62"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* bolts */}
        {[
          [78, 78],
          [322, 78],
          [78, 322],
          [322, 322],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="var(--color-gold-light)" stroke="var(--color-gold-deep)" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}
