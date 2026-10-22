"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/src/hooks/useAuth";
import { discountsApi } from "@/src/lib/api";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

type Period = "month" | "year" | "all";

export default function AmbassadorLeaderboardPage() {
  const { t } = useI18n();
  const { user, isHydrated } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const leaderboard = useQuery({
    queryKey: ["ambassadors", "leaderboard", period],
    queryFn: () => discountsApi.getAmbassadorLeaderboard(period),
    enabled: isHydrated && Boolean(user?.is_ambassador),
  });

  if (!isHydrated) return null;
  if (!user?.is_ambassador)
    return (
      <main className="grid min-h-64 place-items-center px-6 text-center text-sm text-ink-muted">
        {t("ambassador.restricted")}
      </main>
    );
  const current = leaderboard.data?.results.find(
    (row) => row.ambassador.id === leaderboard.data.current_ambassador_id,
  );

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="mb-6 overflow-hidden rounded-2xl bg-navy p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-gold">
              {t("ambassador.title")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {t("ambassador.headline")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/65">
              {t("ambassador.description")}
            </p>
          </div>
          <Trophy className="h-10 w-10 shrink-0 text-gold" />
        </div>
        {current ? (
          <div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/55">{t("ambassador.rank")}</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                #{current.rank}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/55">{t("ambassador.period")}</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatCurrency(current.period_credits)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/55">{t("ambassador.credits")}</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {formatCurrency(Number(current.ambassador.credit_balance))}
              </p>
            </div>
          </div>
        ) : null}
      </header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-navy">
            {leaderboard.data?.period_label ?? t("ambassador.leaderboard")}
          </h2>
          <p className="text-sm text-ink-muted">
            {t("ambassador.preserved")}
          </p>
        </div>
        <div className="flex rounded-full bg-steam p-1">
          {(["month", "year", "all"] as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${period === item ? "bg-navy text-white" : "text-ink-muted"}`}
            >
              {t(`ambassador.${item}`)}
            </button>
          ))}
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-crease bg-white">
        <div className="divide-y divide-crease">
          {leaderboard.data?.results.map((row) => {
            const mine =
              row.ambassador.id === leaderboard.data?.current_ambassador_id;
            return (
              <article
                key={row.ambassador.id}
                className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6 ${mine ? "bg-gold-50" : ""}`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full font-display text-sm font-semibold ${row.rank === 1 ? "bg-gold text-navy" : "bg-steam text-ink-muted"}`}
                >
                  {row.rank === 1 ? (
                    <Crown className="h-4 w-4" />
                  ) : row.rank <= 3 ? (
                    <Medal className="h-4 w-4" />
                  ) : (
                    row.rank
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {row.ambassador.name}
                    {mine ? ` · ${t("ambassador.you")}` : ""}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {row.orders} {row.orders === 1 ? t("ambassador.referredOrder") : t("ambassador.referredOrders")} ·{" "}
                    {row.ambassador.promo_code}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-navy">
                    {formatCurrency(row.period_credits)}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {formatCurrency(row.referred_revenue)} {t("ambassador.revenue")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
