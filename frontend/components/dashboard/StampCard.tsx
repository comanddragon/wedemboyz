"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Gift, Sparkles } from "lucide-react";

import { Button, Card } from "@/components/ui";
import type { StampCardProgress } from "@/types";

/** Punch-card visual over the loyalty points ledger — every `points_per_stamp`
 * points is one stamp, every `stamps_required` stamps is a free wash. Mirrors
 * services.loyalty.stamp_card_progress. */
export function StampCard({
    progress,
    onRedeem,
    isRedeeming,
    errorMessage,
}: {
    progress: StampCardProgress;
    onRedeem: () => void;
    isRedeeming: boolean;
    errorMessage?: string | null;
}) {
    const shouldReduceMotion = useReducedMotion();

    if (!progress.configured || !progress.stamps_required) {
        return null;
    }

    const slots = Array.from({ length: progress.stamps_required }, (_, i) => i < progress.stamps_on_current_card);
    const hasFreeWash = progress.free_washes_available > 0;

    return (
        <Card className="mb-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-ink">Stamp card</p>
                    <p className="text-xs text-ink-muted">
                        {progress.points_to_next_stamp !== null && progress.points_to_next_stamp > 0
                            ? `${progress.points_to_next_stamp} points to your next stamp`
                            : "Your next stamp is ready"}
                    </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold">
                    <Droplets className="h-4 w-4" aria-hidden="true" />
                </span>
            </div>

            <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
                {slots.map((filled, i) => (
                    <motion.span
                        key={i}
                        initial={shouldReduceMotion || !filled ? undefined : { scale: 0.6, opacity: 0 }}
                        animate={shouldReduceMotion || !filled ? undefined : { scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : i * 0.03, ease: "easeOut" }}
                        className={`flex aspect-square items-center justify-center rounded-full border-2 ${
                            filled ? "border-gold bg-gold-50 text-gold" : "border-dashed border-crease text-ink-muted/40"
                        }`}
                        aria-label={filled ? "Stamp earned" : "Stamp not yet earned"}
                    >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </motion.span>
                ))}
            </div>

            {hasFreeWash && (
                <motion.div
                    initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-gold/30 bg-gold-50 p-4 sm:flex-row sm:items-center"
                >
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-navy">
                            <Gift className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-navy">
                                {progress.free_washes_available > 1
                                    ? `${progress.free_washes_available} free washes ready`
                                    : "A free wash is ready"}
                            </p>
                            <p className="text-xs text-ink-muted">Redeem now, or save it for later.</p>
                        </div>
                    </div>
                    <Button variant="gold" onClick={onRedeem} disabled={isRedeeming}>
                        {isRedeeming ? "Redeeming..." : "Redeem free wash"}
                    </Button>
                </motion.div>
            )}

            {errorMessage && <p className="mt-3 text-xs text-status-cancelled-text">{errorMessage}</p>}
        </Card>
    );
}
