"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Camera, Check, Copy, Crown, Medal, Sparkles, Star, Trophy } from "lucide-react";
import { useState } from "react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { useI18n } from "@/src/i18n/I18nProvider";
import { discountsApi } from "@/src/lib/api";
import { formatCurrency } from "@/src/lib/constants";
import type { AmbassadorLeaderboardRow } from "@/src/types";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";

type Period = "month" | "year" | "all";
const podiumTone = ["border-gold bg-gold text-navy", "border-white/20 bg-white/10 text-white", "border-gold/40 bg-gold/15 text-gold"];

function PodiumPlace({ row, mine, youLabel, referralsLabel }: { row: AmbassadorLeaderboardRow; mine: boolean; youLabel: string; referralsLabel: string }) {
  return (
    <article className={`relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[26px] border p-5 transition-transform duration-300 motion-safe:hover:-translate-y-1 ${podiumTone[row.rank - 1] ?? podiumTone[2]} ${row.rank === 1 ? "sm:-translate-y-4 sm:hover:-translate-y-5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="relative">
          <CustomerAvatar name={row.ambassador.name} size="xl" imageUrl={row.ambassador.profile_photo} forceProfilePhoto className={row.rank === 1 ? "ring-4 ring-navy/20" : "ring-2 ring-white/20"} />
          <span className={`absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border font-display text-sm font-bold ${row.rank === 1 ? "border-gold bg-navy text-gold" : "border-white/20 bg-navy text-white"}`}>
            {row.rank === 1 ? <Crown className="h-4 w-4" aria-hidden="true" /> : row.rank}
          </span>
        </div>
        {mine ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${row.rank === 1 ? "bg-navy text-white" : "bg-gold text-navy"}`}>{youLabel}</span> : null}
      </div>
      <div>
        <p className="truncate font-display text-xl font-semibold tracking-[-0.02em]">{row.ambassador.name}</p>
        <p className={`mt-1 text-xs ${row.rank === 1 ? "text-navy/65" : "text-white/60"}`}>{row.orders} {referralsLabel} · {row.ambassador.promo_code}</p>
        <p className="mt-5 font-display text-2xl font-bold tabular-nums">{formatCurrency(row.period_credits)}</p>
      </div>
    </article>
  );
}

export default function AmbassadorLeaderboardPage() {
  const { t, locale } = useI18n();
  const { user, isHydrated } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const leaderboard = useQuery({
    queryKey: ["ambassadors", "leaderboard", period],
    queryFn: () => discountsApi.getAmbassadorLeaderboard(period),
    enabled: isHydrated && Boolean(user?.is_ambassador || user?.is_staff),
  });

  if (!isHydrated) return null;
  if (!user?.is_ambassador && !user?.is_staff) return <main className="grid min-h-64 place-items-center px-6 text-center text-sm text-ink-muted">{t("ambassador.restricted")}</main>;

  if (user?.is_ambassador && !user.avatar) {
    return (
      <main className="mx-auto w-full max-w-[1320px] px-4 py-16 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-md rounded-[28px] border border-gold/40 bg-gold-50/90 p-8 text-center shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gold text-navy shadow-sm">
            <Camera className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-navy">
            {t("ambassador.photoRequiredTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-navy/70">
            {t("ambassador.photoRequiredBody")}
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-transform hover:bg-navy-800 active:scale-95"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            {t("ambassador.uploadPhotoCta")}
          </Link>
        </div>
      </main>
    );
  }

  const results = leaderboard.data?.results ?? [];
  const current = results.find((row) => row.ambassador.id === leaderboard.data?.current_ambassador_id);
  const topThree = results.slice(0, 3);
  const field = results.slice(3);
  const periodLabel = period === "month"
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" }).format(new Date())
    : period === "year"
      ? String(new Date().getFullYear())
      : t("ambassador.all");

  async function copyCode() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.ambassador.promo_code);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
      <section className="relative overflow-hidden rounded-[30px] bg-navy px-5 py-7 text-white sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-gold/15" />
        <div className="pointer-events-none absolute bottom-8 right-[28%] h-3 w-3 rounded-full bg-gold shadow-[34px_-52px_0_2px_rgba(223,160,19,0.45),-42px_38px_0_1px_rgba(223,160,19,0.3)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold"><Sparkles className="h-4 w-4" aria-hidden="true" />{t("ambassador.title")}</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl">{t("ambassador.headline")}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">{t("ambassador.description")}</p>
          </div>
          {current ? (
            <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">{t("ambassador.yourCode")}</p><p className="mt-1 font-display text-2xl font-bold tracking-[0.08em] text-gold">{current.ambassador.promo_code}</p>{copyFailed ? <p className="mt-1 text-[10px] text-status-cancelled-bg" role="alert">{t("ambassador.copyFailed")}</p> : null}</div>
                <button type="button" onClick={copyCode} className="grid h-11 w-11 place-items-center rounded-full bg-gold text-navy transition-transform active:scale-95" aria-label={t("ambassador.copyCode")}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</button>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                <div><p className="text-[10px] uppercase tracking-wider text-white/45">{t("ambassador.rank")}</p><p className="mt-1 font-display text-xl font-bold">#{current.rank}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-white/45">{t("ambassador.period")}</p><p className="mt-1 font-display text-xl font-bold text-gold">{formatCurrency(current.period_credits)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-white/45">{t("ambassador.orders")}</p><p className="mt-1 font-display text-xl font-bold">{current.orders}</p></div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-gold/25 bg-gold/10 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{t("ambassador.adminView")}</p><p className="mt-2 text-sm leading-6 text-white/65">{t("ambassador.adminViewBody")}</p></div>
          )}
        </div>
      </section>

      <section className="relative z-10 -mt-3 rounded-t-[28px] bg-paper px-1 pt-8 sm:px-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-600">{t("ambassador.hallOfFame")}</p><h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em] text-navy sm:text-3xl">{periodLabel}</h2></div>
          <div className="inline-flex w-fit rounded-full border border-crease bg-white p-1 shadow-sm">
            {(["month", "year", "all"] as Period[]).map((item) => <button key={item} type="button" onClick={() => setPeriod(item)} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${period === item ? "bg-navy text-white" : "text-ink-muted hover:text-navy"}`}>{t(`ambassador.${item}`)}</button>)}
          </div>
        </div>
        {leaderboard.isLoading ? <div className="mt-8 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-[26px] bg-steam" />)}</div> : null}
        {leaderboard.isError ? <div className="mt-8 rounded-2xl border border-status-cancelled-text/20 bg-status-cancelled-bg p-5 text-sm text-status-cancelled-text">{t("ambassador.loadError")}</div> : null}
        {!leaderboard.isLoading && !leaderboard.isError && results.length === 0 ? <div className="mt-8 rounded-[26px] border border-dashed border-gold/40 bg-gold-50 px-6 py-12 text-center"><Trophy className="mx-auto h-9 w-9 text-gold" aria-hidden="true" /><h3 className="mt-3 font-display text-xl font-bold text-navy">{t("ambassador.empty")}</h3><p className="mt-1 text-sm text-ink-muted">{t("ambassador.emptyBody")}</p></div> : null}
        {topThree.length ? <div className={`mt-10 grid gap-4 rounded-[30px] bg-navy p-4 pt-8 sm:items-end sm:p-6 sm:pt-10 ${topThree.length === 1 ? "sm:grid-cols-1 sm:[&>article]:mx-auto sm:[&>article]:w-full sm:[&>article]:max-w-md" : topThree.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>{topThree.map((row) => <PodiumPlace key={row.ambassador.id} row={row} mine={row.ambassador.id === leaderboard.data?.current_ambassador_id} youLabel={t("ambassador.you")} referralsLabel={row.orders === 1 ? t("ambassador.referredOrder") : t("ambassador.referredOrders")} />)}</div> : null}
        {field.length ? (
          <div className="mt-6 overflow-hidden rounded-[26px] border border-crease bg-white">
            <div className="flex items-center justify-between border-b border-crease px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><Medal className="h-4 w-4 text-gold" aria-hidden="true" /><h3 className="font-display text-base font-bold text-navy">{t("ambassador.chasingPodium")}</h3></div><p className="hidden text-xs text-ink-muted sm:block">{t("ambassador.preserved")}</p></div>
            <div className="divide-y divide-crease">{field.map((row) => { const mine = row.ambassador.id === leaderboard.data?.current_ambassador_id; return <article key={row.ambassador.id} className={`grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6 ${mine ? "bg-gold-50" : ""}`}><span className="relative"><CustomerAvatar name={row.ambassador.name} size="sm" imageUrl={row.ambassador.profile_photo} forceProfilePhoto /><span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1 text-[9px] font-bold text-white ring-2 ring-white">{row.rank}</span></span><div className="min-w-0"><p className="truncate text-sm font-bold text-navy">{row.ambassador.name}{mine ? ` · ${t("ambassador.you")}` : ""}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted"><Star className="h-3 w-3 text-gold" aria-hidden="true" />{row.orders} {row.orders === 1 ? t("ambassador.referredOrder") : t("ambassador.referredOrders")}</p></div><div className="text-right"><p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-navy">{formatCurrency(row.period_credits)} <ArrowUpRight className="h-3.5 w-3.5 text-status-ready-text" aria-hidden="true" /></p><p className="mt-0.5 text-[11px] text-ink-muted">{formatCurrency(row.referred_revenue)} {t("ambassador.revenue")}</p></div></article>; })}</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
