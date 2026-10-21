"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Check,
  Crown,
  Gift,
  History,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { Button, Field, Input } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { useAuth } from "@/src/hooks/useAuth";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { LoyaltyTier, LoyaltyTransactionType } from "@/src/types";

const TIER_ORDER: LoyaltyTier[] = ["BRONZE", "SILVER", "GOLD"];

const TIER_LADDER_STYLES: Record<
  LoyaltyTier,
  { icon: string; ring: string; label: string }
> = {
  BRONZE: { icon: "text-bronze", ring: "border-bronze", label: "Bronze" },
  SILVER: { icon: "text-silver-600", ring: "border-silver", label: "Silver" },
  GOLD: { icon: "text-gold", ring: "border-gold", label: "Gold" },
};

const TRANSACTION_META: Record<
  LoyaltyTransactionType,
  { label: string; icon: typeof TrendingUp; tone: string; sign: "+" | "−" }
> = {
  EARN: {
    label: "Earned",
    icon: TrendingUp,
    tone: "bg-status-ready-bg text-status-ready-text",
    sign: "+",
  },
  REDEEM: {
    label: "Redeemed",
    icon: Gift,
    tone: "bg-gold-50 text-gold",
    sign: "−",
  },
  EXPIRE: {
    label: "Expired",
    icon: RefreshCw,
    tone: "bg-status-cancelled-bg text-status-cancelled-text",
    sign: "−",
  },
  ADJUST: {
    label: "Adjusted",
    icon: RefreshCw,
    tone: "bg-status-pending-bg text-status-pending-text",
    sign: "+",
  },
};

export default function LoyaltyPage() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [points, setPoints] = useState("100");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stampCardError, setStampCardError] = useState<string | null>(null);

  const { data: account, isLoading } = useQuery({
    queryKey: queryKeys.discounts.loyalty,
    queryFn: () => discountsApi.getLoyaltyAccount(),
    enabled: isHydrated && !user?.is_staff,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: queryKeys.discounts.loyaltyTransactions(1),
    queryFn: () => discountsApi.listLoyaltyTransactions(1),
    enabled: isHydrated && !user?.is_staff,
  });

  useEffect(() => {
    if (isHydrated && user?.is_staff) {
      router.replace("/admin/loyalty");
    }
  }, [isHydrated, router, user?.is_staff]);

  const redeemMutation = useMutation({
    mutationFn: () =>
      discountsApi.redeemLoyaltyPoints({ points: Number(points) }),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyalty });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.loyaltyTransactions(1),
      });
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const redeemStampCardMutation = useMutation({
    mutationFn: () => discountsApi.redeemStampCard(),
    onSuccess: () => {
      setStampCardError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyalty });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.loyaltyTransactions(1),
      });
    },
    onError: (error) => setStampCardError(getApiErrorMessage(error)),
  });

  const parsedPoints = Number(points);
  const isValidAmount = Number.isFinite(parsedPoints) && parsedPoints > 0;
  const exceedsBalance =
    account != null && parsedPoints > account.points_balance;

  const currentTierIndex = useMemo(
    () => (account ? TIER_ORDER.indexOf(account.tier) : -1),
    [account],
  );

  const customerName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
      user.phone_number
    : "Customer";

  const formatPoints = (value: number) => value.toLocaleString("en-US");

  if (!isHydrated || user?.is_staff) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="mb-6 flex items-center gap-3">
        <CustomerAvatar name={customerName} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-navy sm:text-[2rem]">
            Your rewards
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            One place for your points, membership, and wash rewards.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
          <div className="h-72 rounded-2xl bg-steam" />
          <div className="h-72 rounded-2xl bg-steam" />
        </div>
      ) : account ? (
        <>
          <section className="mb-6 overflow-hidden rounded-2xl bg-navy text-white" aria-labelledby="rewards-overview-title">
            <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)]">
              <div className="p-6 sm:p-8 lg:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p id="rewards-overview-title" className="text-sm font-medium text-white/70">Available balance</p>
                    <p className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                      {formatPoints(account.points_balance)}
                      <span className="ml-2 text-base font-medium tracking-normal text-white/60">points</span>
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs text-white/55">Membership status</p>
                    <div className="mt-1 flex items-center gap-2">
                      {account.tier === "GOLD" ? <Crown className="h-5 w-5 text-gold" aria-hidden="true" /> : <Award className="h-5 w-5 text-gold" aria-hidden="true" />}
                      <p className="font-display text-xl font-semibold capitalize">{account.tier.toLowerCase()} member</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-white/55">All-time earned</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums">{formatPoints(account.lifetime_points_earned)} pts</p>
                  </div>
                </div>
              </div>

              <form
                className="border-t border-white/10 bg-white/[0.06] p-6 sm:p-8 lg:border-l lg:border-t-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isValidAmount || exceedsBalance) return;
                  redeemMutation.mutate();
                }}
              >
                <h2 className="font-display text-lg font-semibold">Use your points</h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">Choose how many points to apply to your next reward.</p>
                <div className="mt-5 [&_label]:text-white/70 [&_input]:border-white/20 [&_input]:bg-white [&_input]:text-navy">
                  <Field label="Points to redeem">
                    <Input type="number" min="1" max={account.points_balance} value={points} onChange={(event) => setPoints(event.target.value)} />
                  </Field>
                </div>
                <Button variant="gold" className="w-full" type="submit" disabled={redeemMutation.isPending || !isValidAmount || exceedsBalance}>
                  {redeemMutation.isPending ? "Redeeming…" : "Redeem points"}
                </Button>
                {exceedsBalance ? <p className="mt-3 text-xs text-red-200">Your available balance is {formatPoints(account.points_balance)} points.</p> : null}
                {errorMessage ? <p className="mt-3 text-xs text-red-200">{errorMessage}</p> : null}
              </form>
            </div>
          </section>

          <div className="mb-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <section className="overflow-hidden rounded-2xl border border-crease bg-white" aria-labelledby="stamp-card-title">
              <div className="flex flex-col justify-between gap-4 border-b border-crease px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 id="stamp-card-title" className="font-display text-xl font-semibold text-navy">Wash reward card</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {account.stamp_card.configured
                      ? account.stamp_card.points_to_next_stamp && account.stamp_card.points_to_next_stamp > 0
                        ? `${formatPoints(account.stamp_card.points_to_next_stamp)} points until your next stamp.`
                        : "Your next stamp is ready."
                      : "The wash reward card is not active yet."}
                  </p>
                </div>
                {account.stamp_card.configured && account.stamp_card.stamps_required ? (
                  <p className="shrink-0 font-display text-lg font-semibold tabular-nums text-navy">
                    {account.stamp_card.stamps_on_current_card} <span className="font-sans text-xs font-normal text-ink-muted">of {account.stamp_card.stamps_required} stamps</span>
                  </p>
                ) : null}
              </div>
              <div className="p-5 sm:p-6">
                {account.stamp_card.configured && account.stamp_card.stamps_required ? (
                  <div className="grid grid-cols-5 gap-3 sm:grid-cols-10" aria-label={`${account.stamp_card.stamps_on_current_card} of ${account.stamp_card.stamps_required} stamps earned`}>
                    {Array.from({ length: account.stamp_card.stamps_required }, (_, index) => {
                      const earned = index < account.stamp_card.stamps_on_current_card;
                      return (
                        <span key={index} className={`grid aspect-square place-items-center rounded-full border ${earned ? "border-gold bg-gold-50 text-gold-600" : "border-dashed border-crease text-ink-muted/35"}`} aria-label={earned ? `Stamp ${index + 1} earned` : `Stamp ${index + 1} not earned`}>
                          {earned ? <Check className="h-4 w-4" aria-hidden="true" /> : <Star className="h-3.5 w-3.5" aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-ink-muted">Your stamps will appear here when the programme is available.</p>}

                {account.stamp_card.free_washes_available > 0 ? (
                  <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-gold-50 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy"><Gift className="h-5 w-5" aria-hidden="true" /></span>
                      <div><p className="text-sm font-semibold text-navy">{account.stamp_card.free_washes_available === 1 ? "Free wash ready" : `${account.stamp_card.free_washes_available} free washes ready`}</p><p className="text-xs text-ink-muted">Use it now or keep it for a later order.</p></div>
                    </div>
                    <Button variant="gold" onClick={() => redeemStampCardMutation.mutate()} disabled={redeemStampCardMutation.isPending}>
                      {redeemStampCardMutation.isPending ? "Redeeming…" : "Redeem free wash"}
                    </Button>
                  </div>
                ) : null}
                {stampCardError ? <p className="mt-3 text-xs text-status-cancelled-text">{stampCardError}</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-crease bg-white p-5 sm:p-6" aria-labelledby="tier-path-title">
              <h2 id="tier-path-title" className="font-display text-xl font-semibold text-navy">Membership path</h2>
              <p className="mt-1 text-sm text-ink-muted">Keep earning with every eligible order to unlock higher membership levels.</p>
              <ol className="mt-6 space-y-1">
                {TIER_ORDER.map((tier, index) => {
                  const style = TIER_LADDER_STYLES[tier];
                  const Icon = tier === "GOLD" ? Crown : Award;
                  const isCurrent = tier === account.tier;
                  const isReached = currentTierIndex >= index;
                  return (
                    <li key={tier} className={`flex items-center gap-3 rounded-xl px-3 py-3 ${isCurrent ? "bg-gold-50" : ""}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white ${isReached ? `${style.ring} ${style.icon}` : "border-crease text-ink-muted"}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${isReached ? "text-navy" : "text-ink-muted"}`}>{style.label}</p><p className="text-xs text-ink-muted">{isCurrent ? "Your current level" : isReached ? "Completed" : "Ahead of you"}</p></div>
                      {isCurrent ? <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-semibold text-white">Current</span> : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-crease bg-white" aria-labelledby="activity-title">
        <div className="flex items-center gap-3 border-b border-crease px-5 py-5 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-steam text-navy"><History className="h-4 w-4" aria-hidden="true" /></span>
          <div><h2 id="activity-title" className="font-display text-xl font-semibold text-navy">Points activity</h2><p className="text-sm text-ink-muted">A record of points earned, used, expired, or adjusted.</p></div>
        </div>

        {isLoadingTransactions ? <div className="h-40 animate-pulse bg-steam/60" /> : transactions && transactions.results.length === 0 ? (
          <div className="px-6 py-12 text-center"><Sparkles className="mx-auto h-6 w-6 text-gold" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-navy">No points activity yet</p><p className="mt-1 text-sm text-ink-muted">Your first eligible order will start your rewards history.</p></div>
        ) : (
          <ul className="divide-y divide-crease">
            {transactions?.results.map((tx) => {
              const meta = TRANSACTION_META[tx.transaction_type];
              const Icon = meta.icon;
              return (
                <li key={tx.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6">
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${meta.tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy">{tx.note || meta.label}</p><p className="mt-0.5 text-xs text-ink-muted">{meta.label} · {new Date(tx.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p></div>
                  <p className={`text-sm font-semibold tabular-nums ${meta.sign === "+" ? "text-status-ready-text" : "text-status-cancelled-text"}`}>{meta.sign}{formatPoints(Math.abs(tx.points))} pts</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
