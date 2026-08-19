"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * BubbleOverlay
 * ------------------------------------------------------------------
 * A quiet, continuous field of rising soap bubbles used as a global
 * atmospheric layer for the whole site (mounted once in the root
 * layout). Designed to read the way ambient motion reads on Linear,
 * Stripe, or Apple product pages: noticed subconsciously, never
 * competing with content.
 *
 * - Pure CSS transform/opacity animation (GPU-accelerated), driven by
 *   per-bubble CSS custom properties against a single shared
 *   @keyframes definition — no per-bubble <style> tags, no JS-driven
 *   frame loop.
 * - `pointer-events: none` throughout; sits behind page content
 *   (z-index far below the sticky nav's z-40) and above the plain
 *   page background.
 * - Bubble count, size, spawn rate, timing, and look are all pulled
 *   from the CONFIG object below so the effect can be tuned without
 *   touching the animation logic.
 * - Fully disabled for `prefers-reduced-motion: reduce`.
 */

// ---------------------------------------------------------------------------
// Configuration — tune the effect here.
// ---------------------------------------------------------------------------
const CONFIG = {
    /** Simultaneous bubbles on screen, by breakpoint. */
    maxBubbles: {
        mobile: 7, // < 640px
        tablet: 12, // 640–1023px
        desktop: 20, // >= 1024px
    },
    /** Diameter range in px, by breakpoint (spec asks for ~12–90px on desktop). */
    sizeRange: {
        mobile: [10, 52] as [number, number],
        tablet: [11, 68] as [number, number],
        desktop: [12, 90] as [number, number],
    },
    /** Milliseconds between spawn attempts, by breakpoint. */
    spawnIntervalMs: {
        mobile: 900,
        tablet: 700,
        desktop: 520,
    },
    /** How long a single bubble takes to cross from bottom to top, in seconds. */
    durationRangeS: [14, 26] as [number, number],
    /** Extra random delay before a spawned bubble starts animating, in seconds. */
    delayRangeS: [0, 2.5] as [number, number],
    /** Peak opacity a bubble reaches during its "sustained" phase — the
     *  multiply/screen layers carry their own tuned strength, so this only
     *  needs to handle the fade in/out, not overall visibility. */
    opacityRange: [0.30, 0.45] as [number, number],
    /** Horizontal wander over the bubble's lifetime, in px (sign randomized). */
    driftRangePx: [24, 90] as [number, number],
    /** Bubble shrinks to this fraction of its spawn size by end of life. */
    shrinkRange: [0.7, 0.8] as [number, number],
    /** % of the animation timeline where the fade-to-invisible begins. */
    fadeStartPercent: 55,
    /** Multiplier for the outer glow / inner reflection strength (1 = default). */
    glowIntensity: 1,
} as const;

type Breakpoint = "mobile" | "tablet" | "desktop";

type Bubble = {
    id: number;
    left: number; // vw, spawn position
    size: number; // px
    duration: number; // s
    delay: number; // s
    drift: number; // px, signed
    opacity: number;
    scaleEnd: number;
    rise: number; // vh, negative — total upward travel
};

function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function getBreakpoint(width: number): Breakpoint {
    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
}

function makeBubble(id: number, breakpoint: Breakpoint): Bubble {
    const [minSize, maxSize] = CONFIG.sizeRange[breakpoint];
    const [minDrift, maxDrift] = CONFIG.driftRangePx;
    const [minShrink, maxShrink] = CONFIG.shrinkRange;
    const [minDuration, maxDuration] = CONFIG.durationRangeS;
    const [minDelay, maxDelay] = CONFIG.delayRangeS;
    const [minOpacity, maxOpacity] = CONFIG.opacityRange;

    const driftMagnitude = random(minDrift, maxDrift);
    const driftSign = Math.random() > 0.5 ? 1 : -1;

    return {
        id,
        left: random(2, 98),
        size: random(minSize, maxSize),
        duration: random(minDuration, maxDuration),
        delay: random(minDelay, maxDelay),
        drift: driftMagnitude * driftSign,
        opacity: random(minOpacity, maxOpacity),
        scaleEnd: random(minShrink, maxShrink),
        // Travel comfortably past the top of the viewport before it's removed,
        // so nothing pops out of existence mid-screen.
        rise: -(100 + random(15, 30)),
    };
}

export function BubbleOverlay() {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [enabled, setEnabled] = useState(true);

    const nextId = useRef(0);
    const bubblesRef = useRef<Bubble[]>([]);

    // Keep the ref in sync after render/commit — never mutate a ref's
    // `.current` during the render body itself.
    useEffect(() => {
        bubblesRef.current = bubbles;
    }, [bubbles]);

    // Track viewport size (for bubble count / size) and reduced-motion preference.
    useEffect(() => {
        const updateBreakpoint = () => setBreakpoint(getBreakpoint(window.innerWidth));
        updateBreakpoint();

        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const updateMotionPreference = () => setEnabled(!motionQuery.matches);
        updateMotionPreference();

        window.addEventListener("resize", updateBreakpoint);
        motionQuery.addEventListener("change", updateMotionPreference);

        return () => {
            window.removeEventListener("resize", updateBreakpoint);
            motionQuery.removeEventListener("change", updateMotionPreference);
        };
    }, []);

    // Continuous spawn loop, capped at the per-breakpoint bubble budget.
    // Reduced-motion is handled by simply not rendering (see `if (!enabled)
    // return null` below), so there's no need to reset `bubbles` state here —
    // that would be an unconditional setState call inside an effect body.
    useEffect(() => {
        if (!enabled) return;

        const interval = window.setInterval(() => {
            const max = CONFIG.maxBubbles[breakpoint];
            if (bubblesRef.current.length >= max) return;

            const bubble = makeBubble(nextId.current++, breakpoint);
            setBubbles((current) => [...current, bubble]);

            // Recycle the bubble once its full animation (delay + duration, plus a
            // small safety margin) has finished playing.
            window.setTimeout(
                () => {
                    setBubbles((current) => current.filter((b) => b.id !== bubble.id));
                },
                (bubble.delay + bubble.duration + 0.5) * 1000,
            );
        }, CONFIG.spawnIntervalMs[breakpoint]);

        return () => window.clearInterval(interval);
    }, [enabled, breakpoint]);

    const keyframesCss = useMemo(
        () => `
      /* Pure, unbroken linear motion — drift/rise/shrink move at one constant
         speed for the bubble's entire lifetime. Kept in its own animation
         (own timing-function) so the fade below can't reintroduce easing
         "waypoints" that cause the old speed-up/stop/speed-up stutter. */
      @keyframes at-bubble-move {
        0% {
          transform: translate3d(0, 0, 0) scale(1);
        }
        100% {
          transform: translate3d(var(--bubble-drift), var(--bubble-rise), 0) scale(var(--bubble-scale-end));
        }
      }

      /* Opacity fades in/out on its own timeline — independent of movement,
         so easing the fade never touches the constant-speed transform. */
      @keyframes at-bubble-fade {
        0% {
          opacity: 0;
        }
        10% {
          opacity: var(--bubble-opacity);
        }
        ${CONFIG.fadeStartPercent}% {
          opacity: var(--bubble-opacity);
        }
        88% {
          opacity: 0;
        }
        100% {
          opacity: 0;
        }
      }
    `,
        [],
    );

    if (!enabled) return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
        >
            <style>{keyframesCss}</style>
            {bubbles.map((bubble) => (
                <span
                    key={bubble.id}
                    className="at-bubble"
                    style={
                        {
                            left: `${bubble.left}vw`,
                            width: `${bubble.size}px`,
                            height: `${bubble.size}px`,
                            "--bubble-duration": `${bubble.duration}s`,
                            "--bubble-delay": `${bubble.delay}s`,
                            "--bubble-drift": `${bubble.drift}px`,
                            "--bubble-rise": `${bubble.rise}vh`,
                            "--bubble-opacity": bubble.opacity,
                            "--bubble-scale-end": bubble.scaleEnd,
                            "--bubble-glow": CONFIG.glowIntensity,
                        } as React.CSSProperties
                    }
                />
            ))}

            <style>{`
        .at-bubble {
          position: absolute;
          bottom: -10vh;
          border-radius: 9999px;
          opacity: 0;
          will-change: transform, opacity;
          /* Movement: strictly linear so speed never dips or spikes over the
             bubble's lifetime. Fade: eased independently, on the same
             duration/delay, so it can't perturb the movement's timing. */
          animation-name: at-bubble-move, at-bubble-fade;
          animation-duration: var(--bubble-duration), var(--bubble-duration);
          animation-delay: var(--bubble-delay), var(--bubble-delay);
          animation-timing-function: linear, ease-in-out;
          animation-fill-mode: forwards, forwards;
        }

        /* A real soap film reads two ways at once: a darker rim/shadow
           against bright surfaces, and a bright highlight against dark
           ones. One flat white blob only ever does the second — invisible
           on paper/white sections, visible only over navy. Splitting it
           into two blended layers makes it read against both. */
        .at-bubble::before,
        .at-bubble::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 9999px;
        }

        /* Rim + shadow layer — multiply darkens whatever is behind it, so
           this is what makes the bubble visible on paper/white sections. */
        .at-bubble::before {
          mix-blend-mode: multiply;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(120, 148, 184, 0.02) 0%,
            rgba(96, 126, 168, 0.14) 60%,
            rgba(70, 98, 140, 0.3) 86%,
            rgba(50, 76, 116, 0.4) 100%
          );
          border: 1px solid rgba(60, 92, 136, 0.24);
          box-shadow: inset -3px -3px 6px rgba(25, 38, 69, 0.14);
          opacity: 0.40;
        }

        /* Highlight + glow layer — screen brightens whatever is behind it,
           so this is what makes the bubble visible on navy/dark sections. */
        .at-bubble::after {
          mix-blend-mode: screen;
          background:
            radial-gradient(circle at 30% 26%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.32) 9%, rgba(255, 255, 255, 0) 22%),
            radial-gradient(circle at 70% 74%, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 28%),
            radial-gradient(circle at 50% 50%, rgba(200, 228, 246, 0.3) 0%, rgba(150, 196, 230, 0.12) 55%, rgba(255, 255, 255, 0) 85%);
          box-shadow:
            0 0 calc(10px * var(--bubble-glow)) rgba(190, 214, 240, 0.4),
            inset 0 0 calc(8px * var(--bubble-glow)) rgba(255, 255, 255, 0.35);
            opacity: 1.20;
        }
      `}</style>
        </div>
    );
}