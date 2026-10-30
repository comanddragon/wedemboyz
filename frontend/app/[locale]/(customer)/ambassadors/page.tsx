"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Crown, Medal, RefreshCw, Trophy } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useI18n } from "@/src/i18n/I18nProvider";
import { discountsApi } from "@/src/lib/api";
import { formatCurrency } from "@/src/lib/constants";
import type { AmbassadorLeaderboardRow } from "@/src/types";
import styles from "./leaderboard.module.css";

type Period = "month" | "year" | "all";
type Ambassador = AmbassadorLeaderboardRow["ambassador"];

function Portrait({
  ambassador,
  champion = false,
}: {
  ambassador: Ambassador;
  champion?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`${styles.portrait} ${champion ? styles.championPortrait : ""}`}
    >
      {ambassador.profile_photo && !failed ? (
        <Image
          src={ambassador.profile_photo}
          alt={ambassador.name}
          fill
          unoptimized
          sizes={champion ? "240px" : "180px"}
          className="object-cover object-center"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.initials} aria-label={ambassador.name}>
          {ambassador.name
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}

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

function PodiumPlace({
  row,
  mine,
}: {
  row: AmbassadorLeaderboardRow;
  mine: boolean;
}) {
  const { t, locale } = useI18n();
  const champion = row.rank === 1;
  const rankLabel =
    locale === "fr"
      ? ["Première place", "Deuxième place", "Troisième place"]
      : ["First place", "Second place", "Third place"];
  return (
    <article
      className={`${styles.podiumPlace} ${champion ? styles.champion : row.rank === 2 ? styles.second : styles.third}`}
      aria-label={`${rankLabel[row.rank - 1]} — ${row.ambassador.name}`}
    >
      <div className={styles.placeHeading}>
        {champion ? (
          <Crown size={22} aria-hidden="true" />
        ) : (
          <Medal size={20} aria-hidden="true" />
        )}
        <span>{rankLabel[row.rank - 1]}</span>
        {mine ? (
          <span className={styles.you}>{t("ambassador.you")}</span>
        ) : null}
      </div>
      <div className={styles.portraitStage}>
        <span className={styles.rankBackdrop} aria-hidden="true">
          {String(row.rank).padStart(2, "0")}
        </span>
        <Portrait ambassador={row.ambassador} champion={champion} />
        <span className={styles.rankSeal} aria-hidden="true">
          {champion ? <Crown size={21} /> : row.rank}
        </span>
      </div>
      <div className={styles.identity}>
        <h3>{row.ambassador.name}</h3>
        <PromoCode code={row.ambassador.promo_code} />
      </div>
      <div className={styles.podiumScore}>
        <p>{formatCurrency(row.period_credits)}</p>
        <span>
          {row.orders}{" "}
          {t(
            row.orders === 1
              ? "ambassador.referredOrder"
              : "ambassador.referredOrders",
          )}
        </span>
      </div>
    </article>
  );
}

export default function AmbassadorLeaderboardPage() {
  const { t, locale } = useI18n();
  const { isHydrated } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const leaderboard = useQuery({
    queryKey: ["ambassadors", "leaderboard", period],
    queryFn: () => discountsApi.getAmbassadorLeaderboard(period),
    enabled: isHydrated,
  });
  const results = leaderboard.data?.results ?? [];
  const current = results.find(
    (row) => row.ambassador.id === leaderboard.data?.current_ambassador_id,
  );
  const topThree = results.slice(0, 3);
  const field = results.slice(3);
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
            <p className={styles.description}>{t("ambassador.description")}</p>
          </div>
          <Trophy
            className={styles.headerTrophy}
            strokeWidth={1}
            aria-hidden="true"
          />
        </header>
        {current ? (
          <aside className={styles.personal}>
            <span>
              {t("ambassador.you")} <strong>#{current.rank}</strong>
            </span>
            <span>{current.ambassador.name}</span>
            <PromoCode code={current.ambassador.promo_code} />
            <span className={styles.personalScore}>
              {formatCurrency(current.period_credits)}
            </span>
          </aside>
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
              className={styles.podium}
              role="status"
              aria-label={
                locale === "fr"
                  ? "Chargement du classement"
                  : "Loading rankings"
              }
            >
              {[1, 2, 3].map((rank) => (
                <div key={rank} className={styles.skeleton}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
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
          {topThree.length ? (
            <div
              className={`${styles.podium} ${topThree.length === 1 ? styles.singlePodium : topThree.length === 2 ? styles.pairPodium : ""}`}
            >
              {topThree.map((row) => (
                <PodiumPlace
                  key={row.ambassador.id}
                  row={row}
                  mine={row.ambassador.id === current?.ambassador.id}
                />
              ))}
            </div>
          ) : null}
        </section>
        {field.length ? (
          <section
            className={styles.contenders}
            aria-labelledby="contenders-title"
          >
            <div className={styles.contendersHeading}>
              <h2 id="contenders-title">{t("ambassador.chasingPodium")}</h2>
              <span>{t("ambassador.preserved")}</span>
            </div>
            <div className={styles.gallery}>
              {field.map((row) => (
                <article
                  className={`${styles.contender} ${row.ambassador.id === current?.ambassador.id ? styles.myPosition : ""}`}
                  key={row.ambassador.id}
                >
                  <div className={styles.contenderPhoto}>
                    <Portrait ambassador={row.ambassador} />
                    <span className={styles.contenderRank}>#{row.rank}</span>
                  </div>
                  <div className={styles.contenderBody}>
                    <div className={styles.contenderIdentity}>
                      <h3>{row.ambassador.name}</h3>
                      <PromoCode code={row.ambassador.promo_code} />
                    </div>
                    {row.ambassador.id === current?.ambassador.id ? (
                      <span className={styles.you}>{t("ambassador.you")}</span>
                    ) : null}
                    <p className={styles.contenderScore}>
                      {formatCurrency(row.period_credits)}
                    </p>
                    <p className={styles.contenderMeta}>
                      {row.orders}{" "}
                      {t(
                        row.orders === 1
                          ? "ambassador.referredOrder"
                          : "ambassador.referredOrders",
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
