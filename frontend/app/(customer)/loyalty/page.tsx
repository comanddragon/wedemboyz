"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Crown, Gift, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { StampCard } from "@/components/dashboard/StampCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button, Card, CreaseDivider, EyebrowLabel, Field, Input } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { LoyaltyTier, LoyaltyTransactionType } from "@/types";

const TIER_ORDER: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD"];

const TIER_LADDER_STYLES: Record<LoyaltyTier, { icon: string; ring: string; label: string }> = {
    BRONZE: { icon: "text-[#A9673A]", ring: "border-[#A9673A]", label: "Bronze" },
    SILVER: { icon: "text-[#8B96A5]", ring: "border-[#8B96A5]", label: "Silver" },
    GOLD: { icon: "text-gold", ring: "border-gold", label: "Gold" },
};

const TRANSACTION_META: Record<
    LoyaltyTransactionType,
    { label: string; icon: typeof TrendingUp; tone: string; sign: "+" | "−" }
> = {
    EARN: { label: "Earned", icon: TrendingUp, tone: "bg-status-ready-bg text-status-ready-text", sign: "+" },
    REDEEM: { label: "Redeemed", icon: Gift, tone: "bg-gold-50 text-gold", sign: "−" },
    EXPIRE: { label: "Expired", icon: RefreshCw, tone: "bg-status-cancelled-bg text-status-cancelled-text", sign: "−" },
    ADJUST: { label: "Adjusted", icon: RefreshCw, tone: "bg-status-pending-bg text-status-pending-text", sign: "+" },
};

export default function LoyaltyPage() {
    const queryClient = useQueryClient();
    const [points, setPoints] = useState("100");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [stampCardError, setStampCardError] = useState<string | null>(null);

    const { data: account, isLoading } = useQuery({
        queryKey: queryKeys.discounts.loyalty,
        queryFn: () => discountsApi.getLoyaltyAccount(),
    });

    const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
        queryKey: queryKeys.discounts.loyaltyTransactions(1),
        queryFn: () => discountsApi.listLoyaltyTransactions(1),
    });

    const redeemMutation = useMutation({
        mutationFn: () => discountsApi.redeemLoyaltyPoints({ points: Number(points) }),
        onSuccess: () => {
            setErrorMessage(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyalty });
            queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyaltyTransactions(1) });
        },
        onError: (error) => setErrorMessage(getApiErrorMessage(error)),
    });

    const redeemStampCardMutation = useMutation({
        mutationFn: () => discountsApi.redeemStampCard(),
        onSuccess: () => {
            setStampCardError(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyalty });
            queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyaltyTransactions(1) });
        },
        onError: (error) => setStampCardError(getApiErrorMessage(error)),
    });

    const parsedPoints = Number(points);
    const isValidAmount = Number.isFinite(parsedPoints) && parsedPoints > 0;
    const exceedsBalance = account != null && parsedPoints > account.points_balance;

    const currentTierIndex = useMemo(
        () => (account ? TIER_ORDER.indexOf(account.tier) : -1),
        [account],
    );

    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-gold">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
                <div>
                    <EyebrowLabel words={["Rewards"]} />
                    <h1 className="font-display text-2xl font-semibold text-navy">Loyalty</h1>
                </div>
            </div>

            {isLoading && <p className="text-sm text-ink-muted">Loading your account...</p>}

            {account && (
                <>
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <StatCard icon={Sparkles} label="Points balance" value={account.points_balance} accent="gold" />
                        <StatCard icon={Award} label="Lifetime points earned" value={account.lifetime_points_earned} />
                    </div>

                    <div className="mb-6">
                        <MembershipCard tier={account.tier} pointsBalance={account.points_balance} />
                    </div>

                    <StampCard
                        progress={account.stamp_card}
                        onRedeem={() => redeemStampCardMutation.mutate()}
                        isRedeeming={redeemStampCardMutation.isPending}
                        errorMessage={stampCardError}
                    />

                    <Card className="mb-6">
                        <p className="mb-4 text-sm font-medium text-ink">Membership tiers</p>
                        <div className="flex items-center justify-between">
                            {TIER_ORDER.map((tier, index) => {
                                const style = TIER_LADDER_STYLES[tier];
                                const Icon = tier === "GOLD" ? Crown : Award;
                                const isCurrent = tier === account.tier;
                                const isReached = currentTierIndex >= index;

                                return (
                                    <div key={tier} className="flex flex-1 flex-col items-center">
                                        <div className="flex w-full items-center">
                                            {index > 0 && (
                                                <div className={`h-px flex-1 ${isReached ? "bg-gold" : "bg-crease"}`} aria-hidden="true" />
                                            )}
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                                                    isReached ? style.ring : "border-crease"
                                                } ${isReached ? style.icon : "text-ink-muted"}`}
                                            >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                                            {index < TIER_ORDER.length - 1 && (
                                                <div
                                                    className={`h-px flex-1 ${currentTierIndex > index ? "bg-gold" : "bg-crease"}`}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </div>
                                        <p className={`mt-2 text-xs font-medium ${isCurrent ? "text-navy" : "text-ink-muted"}`}>
                                            {style.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-4 text-xs text-ink-muted">
                            Earn points with every order — your tier and perks grow the more you use WEDEMBOYZ.
                        </p>
                    </Card>

                    <Card className="mb-6">
                        <p className="mb-3 text-sm font-medium text-ink">Redeem points</p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!isValidAmount || exceedsBalance) return;
                                redeemMutation.mutate();
                            }}
                            className="flex items-end gap-3"
                        >
                            <div className="flex-1">
                                <Field label="Points to redeem">
                                    <Input
                                        type="number"
                                        min="1"
                                        max={account.points_balance}
                                        value={points}
                                        onChange={(e) => setPoints(e.target.value)}
                                    />
                                </Field>
                            </div>
                            <Button type="submit" disabled={redeemMutation.isPending || !isValidAmount || exceedsBalance}>
                                {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                            </Button>
                        </form>
                        {exceedsBalance && (
                            <p className="-mt-2 mb-2 text-xs text-status-cancelled-text">
                                You only have {account.points_balance} points available.
                            </p>
                        )}
                        {errorMessage && <p className="text-sm text-status-cancelled-text">{errorMessage}</p>}
                    </Card>
                </>
            )}

            <CreaseDivider />

            <div className="mb-3">
                <EyebrowLabel words={["Transaction history"]} />
            </div>

            {isLoadingTransactions && <p className="text-sm text-ink-muted">Loading history...</p>}
            {transactions && transactions.results.length === 0 && (
                <p className="text-sm text-ink-muted">No loyalty activity yet.</p>
            )}

            <ul className="space-y-2">
                {transactions?.results.map((tx) => {
                    const meta = TRANSACTION_META[tx.transaction_type];
                    const Icon = meta.icon;

                    return (
                        <li key={tx.id}>
                            <Card className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                                    <div>
                                        <p className="text-sm font-medium text-ink">
                                            {meta.label}
                                            {tx.note && <span className="font-normal text-ink-muted"> — {tx.note}</span>}
                                        </p>
                                        <p className="text-xs text-ink-muted">
                                            {new Date(tx.created_at).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`text-sm font-semibold ${
                                        meta.sign === "+" ? "text-status-ready-text" : "text-status-cancelled-text"
                                    }`}
                                >
                                    {meta.sign}
                                    {Math.abs(tx.points)} pts
                                </p>
                            </Card>
                        </li>
                    );
                })}
            </ul>
        </main>
    );
}