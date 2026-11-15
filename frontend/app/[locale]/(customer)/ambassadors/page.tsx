"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, Trophy } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useI18n } from "@/src/i18n/I18nProvider";
import { discountsApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { formatCurrency } from "@/src/lib/constants";
import styles from "./leaderboard.module.css";

type Period = "month" | "year" | "all";
function PromoCode({ code }: { code: string }) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <span className={styles.promoWrap}>
      <button
        type="button"
        className={styles.promo}
        aria-label={`${t("ambassador.copyCode")}: ${code}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setState("copied");
          } catch {
            setState("failed");
          }
        }}
      >
        <span>{code}</span>
        {state === "copied" ? (
          <Check size={13} aria-hidden="true" />
        ) : (
          <Copy size={13} aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" role="status">
        {state === "copied"
          ? locale === "fr"
            ? "Code copié"
            : "Code copied"
          : state === "failed"
            ? t("ambassador.copyFailed")
            : ""}
      </span>
    </span>
  );
}

export default function AmbassadorLeaderboardPage() {
  const { t, locale } = useI18n();
  const { user, isHydrated } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const leaderboard = useQuery({
    queryKey: ["ambassadors", "leaderboard", period],
    queryFn: () => discountsApi.getAmbassadorLeaderboard(period),
    refetchInterval: 15_000,
    refetchOnWindowFocus: "always",
    enabled: isHydrated,
  });
  const account = useQuery({
    queryKey: queryKeys.discounts.loyalty,
    queryFn: discountsApi.getLoyaltyAccount,
    enabled: isHydrated && Boolean(user?.is_ambassador),
    refetchInterval: 15_000,
    refetchOnWindowFocus: "always",
  });
  const results = leaderboard.data?.results ?? [];
  const current = results.find(
    (row) => row.ambassador.id === leaderboard.data?.current_ambassador_id,
  );
  const periodLabel =
    period === "month"
      ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
          month: "long",
          year: "numeric",
        }).format(new Date())
      : period === "year"
        ? String(new Date().getFullYear())
        : t("ambassador.all");
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>{t("ambassador.title")}</h1>
            <p className={styles.headline}>{t("ambassador.headline")}</p>
          </div>
          <Trophy
            className={styles.headerTrophy}
            strokeWidth={1}
            aria-hidden="true"
          />
        </header>
        {account.data?.ambassador ? (
          <p className="mb-6 text-lg font-semibold" aria-live="polite">
            {t("ambassador.credits")}: {formatCurrency(Number(account.data.ambassador.credit_balance))}
          </p>
        ) : null}
        <section aria-labelledby="rankings-period">
          <div className={styles.toolbar}>
            <div>
              <h2 id="rankings-period">{periodLabel}</h2>
              <p>{t("ambassador.hallOfFame")}</p>
            </div>
            <div
              className={styles.periods}
              role="group"
              aria-label={t("ambassador.period")}
            >
              {(["month", "year", "all"] as Period[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={period === item}
                  onClick={() => setPeriod(item)}
                >
                  {t(`ambassador.${item}`)}
                </button>
              ))}
            </div>
          </div>
          {!isHydrated || leaderboard.isLoading ? (
            <div
              className={styles.loading}
              role="status"
              aria-label={
                locale === "fr"
                  ? "Chargement du classement"
                  : "Loading rankings"
              }
            >
              {locale === "fr" ? "Chargement du classement…" : "Loading rankings…"}
            </div>
          ) : null}
          {leaderboard.isError ? (
            <div className={styles.empty} role="alert">
              <Trophy size={36} aria-hidden="true" />
              <p>{t("ambassador.loadError")}</p>
              <button
                className={styles.retry}
                type="button"
                onClick={() => void leaderboard.refetch()}
              >
                <RefreshCw size={16} aria-hidden="true" />
                {locale === "fr" ? "Réessayer" : "Try again"}
              </button>
            </div>
          ) : null}
          {isHydrated &&
          !leaderboard.isLoading &&
          !leaderboard.isError &&
          !results.length ? (
            <div className={styles.empty}>
              <Trophy size={44} strokeWidth={1.25} aria-hidden="true" />
              <h3>{t("ambassador.empty")}</h3>
              <p>{t("ambassador.emptyBody")}</p>
            </div>
          ) : null}
          {results.length ? (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <caption className="sr-only">
                  {t("ambassador.title")} · {periodLabel}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={styles.rankCol}>{t("ambassador.rankColumn")}</th>
                    <th scope="col">{t("ambassador.name")}</th>
                    <th scope="col">{t("ambassador.promoCode")}</th>
                    <th scope="col" className={styles.num}>{t("ambassador.orders")}</th>
                    <th scope="col" className={styles.num}>{t("ambassador.revenueColumn")}</th>
                    <th scope="col" className={styles.num}>{t("ambassador.commissionAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => {
                    const podium =
                      row.rank === 1 ? styles.first : row.rank === 2 ? styles.second : row.rank === 3 ? styles.third : undefined;
                    return (
                      <tr key={row.ambassador.id} className={podium}>
                        <td className={styles.rankCol} data-label={t("ambassador.rankColumn")}>
                          <span className={styles.rank}>#{row.rank}</span>
                        </td>
                        <th scope="row" className={styles.nameCell}>
                          <span className={styles.name}>
                            <span>{row.ambassador.name}</span>
                            {row.ambassador.id === current?.ambassador.id ? (
                              <span className={styles.you}>{t("ambassador.you")}</span>
                            ) : null}
                          </span>
                        </th>
                        <td className={styles.promoCell} data-label={t("ambassador.promoCode")}>
                          <PromoCode code={row.ambassador.promo_code} />
                        </td>
                        <td className={styles.num} data-label={t("ambassador.orders")}>
                          {row.orders}
                        </td>
                        <td className={styles.num} data-label={t("ambassador.revenueColumn")}>
                          {formatCurrency(row.referred_revenue)}
                        </td>
                        <td className={`${styles.num} ${styles.commission}`} data-label={t("ambassador.commissionAmount")}>
                          {formatCurrency(row.period_credits)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
