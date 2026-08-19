"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";

const PANELS = [
    {
        x: 30,
        y: 40,
        w: 300,
        h: 88,
        rotate: -3,
        fill: "#192645",
        text: "Wash & Fold",
        textColor: "#FFFFFF",
    },
    {
        x: 55,
        y: 92,
        w: 300,
        h: 88,
        rotate: 2,
        fill: "#E4E8EC",
        text: "Dry Cleaning",
        textColor: "#192645",
    },
    {
        x: 35,
        y: 144,
        w: 300,
        h: 88,
        rotate: -2,
        fill: "#C8922F",
        text: "Ironing & Pressing",
        textColor: "#FFFFFF",
    },
    {
        x: 60,
        y: 196,
        w: 300,
        h: 88,
        rotate: 3,
        fill: "#FAFAF7",
        stroke: "#192645",
        text: "Pickup & Delivery",
        textColor: "#192645",
    },
];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STAGGER = 0.12;
const SETTLE_DURATION = 0.55;
const CREASE_DELAY_OFFSET = 0.32;
const CREASE_DURATION = 0.32;

/**
 * The landing page's signature element: a stack of folded-garment panels,
 * each carrying its own crease-line — the literal image "Fold Line"
 * describes, rendered flat and geometric rather than as a stock photo.
 *
 * Motion: one rehearsed entrance, not scattered micro-interactions. Panels
 * drop and settle into their skewed rest angle (a slight overshoot on the
 * rotation, corrected by ease-out-expo, reads as weight settling rather
 * than a generic fade-and-rise). Each crease-line then draws itself in —
 * a small "press" flourish that lands the fold motif rather than just
 * decorating the reveal.
 */
export function FoldStackIllustration() {
    const shouldReduceMotion = useReducedMotion();

    const panelTransition = (index: number): Transition =>
        shouldReduceMotion
            ? { duration: 0.2, ease: "linear" }
            : { delay: index * STAGGER, duration: SETTLE_DURATION, ease: EASE_OUT_EXPO };

    const creaseTransition = (index: number): Transition =>
        shouldReduceMotion
            ? { duration: 0.01 }
            : {
                delay: index * STAGGER + CREASE_DELAY_OFFSET,
                duration: CREASE_DURATION,
                ease: EASE_OUT_EXPO,
            };

    return (
        <svg
            viewBox="0 0 400 320"
            className="h-auto w-full max-w-sm"
            role="img"
            aria-label="Stack of neatly folded, pressed garments"
        >
            {PANELS.map((panel, index) => {
                const cx = panel.x + panel.w / 2;
                const cy = panel.y + panel.h / 2;
                const creaseStroke =
                    panel.fill === "#FAFAF7" ? "#DDE1E5" : "rgba(255,255,255,0.35)";

                return (
                    <motion.g
                        key={index}
                        initial={
                            shouldReduceMotion
                                ? undefined
                                : { opacity: 0, y: -26, rotate: panel.rotate * 1.6 }
                        }
                        animate={{ opacity: 1, y: 0, rotate: panel.rotate }}
                        transition={panelTransition(index)}
                        style={{ transformOrigin: `${cx}px ${cy}px` }}
                    >
                        <rect
                            x={panel.x}
                            y={panel.y}
                            width={panel.w}
                            height={panel.h}
                            rx={10}
                            fill={panel.fill}
                            stroke={panel.stroke ?? "none"}
                            strokeWidth={panel.stroke ? 1.5 : 0}
                        />
                        <text
                            x={cx}
                            y={cy + 7}
                            textAnchor="middle"
                            fontSize="18"
                            fontWeight="700"
                            fill={panel.textColor}
                            style={{
                                fontFamily: "Inter, sans-serif",
                                userSelect: "none",
                            }}
                        >
                            {panel.text}
                        </text>
                        {/* the crease-line — same double-hairline motif as CreaseDivider,
                scaled into the illustration, "pressed" in after the panel settles */}
                        <motion.line
                            x1={panel.x + 16}
                            y1={cy - 1.5}
                            x2={panel.x + panel.w - 16}
                            y2={cy - 1.5}
                            stroke={creaseStroke}
                            strokeWidth={1}
                            initial={shouldReduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={creaseTransition(index)}
                        />
                        <motion.line
                            x1={panel.x + 16}
                            y1={cy + 2.5}
                            x2={panel.x + panel.w - 16}
                            y2={cy + 2.5}
                            stroke={creaseStroke}
                            strokeWidth={1}
                            initial={shouldReduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={creaseTransition(index)}
                        />
                    </motion.g>
                );
            })}
        </svg>
    );
}