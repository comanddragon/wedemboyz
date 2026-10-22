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
import { useMemo, useState } from "react";

import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { discountsApi } from "@/src/lib/api";
import { useAuth } from "@/src/hooks/useAuth";
import { useI18n } from "@/src/i18n/I18nProvider";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { BadgeTier, LoyaltyTransactionType } from "@/src/types";

const TIER_ORDER: BadgeTier[] = ["BASIC", "BRONZE", "SILVER", "GOLD"];

const TIER_LADDER_STYLES: Record<
  BadgeTier,
  { icon: string; ring: string; label: string }
> = {
  BASIC: {
    icon: "text-ink-muted",
    ring: "border-crease-strong",
    label: "Basic",
  },
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
  const { locale, t } = useI18n();
  const { user, isHydrated } = useAuth();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: account, isLoading } = useQuery({
    queryKey: queryKeys.discounts.loyalty,
    queryFn: () => discountsApi.getLoyaltyAccount(),
    enabled: isHydrated,
  });

  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: queryKeys.discounts.loyaltyTransactions(1),
    queryFn: () => discountsApi.listLoyaltyTransactions(1),
    enabled: isHydrated,
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: number) =>
      discountsApi.redeemLoyaltyReward(rewardId),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.loyalty });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discounts.loyaltyTransactions(1),
      });
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  const currentTierIndex = useMemo(
    () => (account ? TIER_ORDER.indexOf(account.badge_program.tier) : -1),
    [account],
  );

  const customerName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
      user.phone_number
    : t("common.customer");

  const formatPoints = (value: number) => value.toLocaleString(locale);

  if (!isHydrated) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="mb-6 flex items-center gap-3">
        <CustomerAvatar name={customerName} size="lg" imageUrl={user?.avatar} useProfilePhoto={user?.use_profile_photo} />
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-navy sm:text-[2rem]">
            {t("loyalty.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("loyalty.subtitle")}
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
          <section
            className="mb-6 overflow-hidden rounded-2xl bg-navy text-white"
            aria-labelledby="rewards-overview-title"
          >
            <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)]">
              <div className="p-6 sm:p-8 lg:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p
                      id="rewards-overview-title"
                      className="text-sm font-medium text-white/70"
                    >
                      {t("loyalty.balance")}
                    </p>
                    <p className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                      {formatPoints(account.points_balance)}
                      <span className="ml-2 text-base font-medium tracking-normal text-white/60">
                        {t("loyalty.credits")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-6">
                  <div>
                    <p className="text-xs text-white/55">{t("loyalty.membership")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {account.badge_program.tier === "GOLD" ? (
                        <Crown
                          className="h-5 w-5 text-gold"
                          aria-hidden="true"
                        />
                      ) : (
                        <Award
                          className="h-5 w-5 text-gold"
                          aria-hidden="true"
                        />
                      )}
                      <p className="font-display text-xl font-semibold capitalize">
                        {t(`loyalty.${account.badge_program.tier.toLowerCase()}`)} {t("loyalty.member")}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-white/55">
                      {t("loyalty.lifetime")}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                      {formatPoints(account.lifetime_points_earned)} {t("loyalty.credits")}
                    </p>
                  </div>
                </div>
              </div>

              <section className="border-t border-white/10 bg-white/[0.06] p-6 sm:p-8 lg:border-l lg:border-t-0">
                <h2 className="font-display text-lg font-semibold">
                  {t("loyalty.creditRewards")}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-white/65">
                  {t("loyalty.redeem")}
                </p>
                <div className="mt-5 space-y-2">
                  {account.programmes.credit_points_enabled ? (
                    account.rewards
                      .filter((reward) => reward.track === "CREDIT")
                      .map((reward) => (
                        <button
                          key={reward.id}
                          type="button"
                          onClick={() => redeemMutation.mutate(reward.id)}
                          disabled={
                            redeemMutation.isPending ||
                            account.points_balance < reward.points_cost
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left text-navy disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span>
                            <span className="block text-sm font-semibold">
                              {reward.name}
                            </span>
                            <span className="block text-xs text-ink-muted">
                              {reward.description}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums">
                            {formatPoints(reward.points_cost)} {t("loyalty.credits")}
                          </span>
                        </button>
                      ))
                  ) : (
                    <p className="text-sm text-white/65">
                      {t("loyalty.pausedCredits")}
                    </p>
                  )}
                </div>
                {errorMessage ? (
                  <p className="mt-3 text-xs text-red-200">{errorMessage}</p>
                ) : null}
              </section>
            </div>
          </section>

          <div className="mb-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
            <section
              className="overflow-hidden rounded-2xl border border-crease bg-white"
              aria-labelledby="stamp-card-title"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-crease px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2
                    id="stamp-card-title"
                    className="font-display text-xl font-semibold text-navy"
                  >
                    {t("loyalty.washCard")}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {account.programmes.badge_tiers_enabled
                      ? t("loyalty.washCardBody")
                      : t("loyalty.pausedCard")}
                  </p>
                </div>
                {account.programmes.badge_tiers_enabled ? (
                  <p className="shrink-0 font-display text-lg font-semibold tabular-nums text-navy">
                    {account.badge_program.badges}{" "}
                    <span className="font-sans text-xs font-normal text-ink-muted">
                      {t("loyalty.of")} {account.badge_program.badges_required} {t("loyalty.badges")}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="p-5 sm:p-6">
                {account.programmes.badge_tiers_enabled ? (
                  <div
                    className="grid grid-cols-5 gap-3 sm:grid-cols-10"
                    aria-label={`${account.badge_program.badges} ${t("loyalty.of")} ${account.badge_program.badges_required} ${t("loyalty.badges")} ${t("loyalty.earned")}`}
                  >
                    {Array.from(
                      { length: account.badge_program.badges_required },
                      (_, index) => {
                        const earned = index < account.badge_program.badges;
                        return (
                          <span
                            key={index}
                            className={`grid aspect-square place-items-center rounded-full border ${earned ? "border-gold bg-gold-50 text-gold-600" : "border-dashed border-crease text-ink-muted/35"}`}
                            aria-label={
                              earned
                                ? `${t("loyalty.stamp")} ${index + 1} ${t("loyalty.earned")}`
                                : `${t("loyalty.stamp")} ${index + 1} ${t("loyalty.notEarned")}`
                            }
                          >
                            {earned ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Star
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">
                    {t("loyalty.stampsUnavailable")}
                  </p>
                )}

                {account.reward_grants
                  .filter(
                    (grant) =>
                      grant.reward.track === "BADGE" && !grant.is_redeemed,
                  )
                  .map((grant) => (
                    <div
                      key={grant.id}
                      className="mt-5 flex items-center gap-3 rounded-xl bg-gold-50 p-4"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-navy">
                        <Gift className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {grant.reward.name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {grant.reward.description ||
                            t("loyalty.badgeRewardFallback")}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            <section
              className="rounded-2xl border border-crease bg-white p-5 sm:p-6"
              aria-labelledby="tier-path-title"
            >
              <h2
                id="tier-path-title"
                className="font-display text-xl font-semibold text-navy"
              >
                {t("loyalty.path")}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {t("loyalty.pathBody")}
              </p>
              <ol className="mt-6 space-y-1">
                {TIER_ORDER.map((tier, index) => {
                  const style = TIER_LADDER_STYLES[tier];
                  const Icon = tier === "GOLD" ? Crown : Award;
                  const isCurrent = tier === account.badge_program.tier;
                  const isReached = currentTierIndex >= index;
                  return (
                    <li
                      key={tier}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 ${isCurrent ? "bg-gold-50" : ""}`}
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white ${isReached ? `${style.ring} ${style.icon}` : "border-crease text-ink-muted"}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold ${isReached ? "text-navy" : "text-ink-muted"}`}
                        >
                          {t(`loyalty.${tier.toLowerCase()}`)}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {isCurrent
                            ? t("loyalty.currentLevel")
                            : isReached
                              ? t("loyalty.completed")
                              : t("loyalty.ahead")}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-semibold text-white">
                          {t("loyalty.current")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl border border-crease bg-white"
        aria-labelledby="activity-title"
      >
        <div className="flex items-center gap-3 border-b border-crease px-5 py-5 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-steam text-navy">
            <History className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="activity-title"
              className="font-display text-xl font-semibold text-navy"
            >
              {t("loyalty.activity")}
            </h2>
            <p className="text-sm text-ink-muted">
              {t("loyalty.activityBody")}
            </p>
          </div>
        </div>

        {isLoadingTransactions ? (
          <div className="h-40 animate-pulse bg-steam/60" />
        ) : transactions && transactions.results.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Sparkles
              className="mx-auto h-6 w-6 text-gold"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-navy">
              {t("loyalty.noActivity")}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {t("loyalty.noActivityBody")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-crease">
            {transactions?.results.map((tx) => {
              const meta = TRANSACTION_META[tx.transaction_type];
              const Icon = meta.icon;
              return (
                <li
                  key={tx.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6"
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">
                      {tx.note || t(`loyalty.${tx.transaction_type.toLowerCase()}Tx`)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {t(`loyalty.${tx.transaction_type.toLowerCase()}Tx`)} ·{" "}
                      {new Date(tx.created_at).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold tabular-nums ${meta.sign === "+" ? "text-status-ready-text" : "text-status-cancelled-text"}`}
                  >
                    {meta.sign}
                    {formatPoints(Math.abs(tx.points))} {t("loyalty.credits")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
