"use client";
import { buttonStyles } from "@/src/components/ui/Button";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Coins,
  ListChecks,
  MessageCircle,
  PackageCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

import { KpiTile } from "@/src/components/dashboard/KpiTile";
import { AccountError } from "@/src/components/dashboard/AccountError";
import { MembershipCard } from "@/src/components/dashboard/MembershipCard";
import {
  Card,
  StatusBadge,
  orderStatusTone,
} from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import {
  discountsApi,
  notificationsApi,
  ordersApi,
  paymentsApi,
  scheduleApi,
} from "@/src/lib/api";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { currentSubscription } from "@/src/lib/subscriptions";
import type { Schedule, SubscriptionPlan, TimeSlot } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
const FINISHED_SCHEDULE_STATUSES = new Set(["COMPLETED", "MISSED"]);
const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING: "morning",
  MIDDAY: "midday",
  AFTERNOON: "afternoon",
  EVENING: "evening",
};
const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  ESSENTIEL: "Pack Essentiel",
  CONFORT: "Pack Confort",
  FAMILLE: "Pack Famille",
};

interface NextEvent {
  orderId: number;
  kind: "pickup" | "delivery";
  date: string;
  timeSlot: TimeSlot;
}

function nextEventFromSchedule(
  orderId: number,
  schedule: Schedule,
): NextEvent | null {
  const events: NextEvent[] = [];
  if (!FINISHED_SCHEDULE_STATUSES.has(schedule.pickup_status))
    events.push({
      orderId,
      kind: "pickup",
      date: schedule.pickup_date,
      timeSlot: schedule.pickup_time_slot,
    });
  if (!FINISHED_SCHEDULE_STATUSES.has(schedule.delivery_status))
    events.push({
      orderId,
      kind: "delivery",
      date: schedule.delivery_date,
      timeSlot: schedule.delivery_time_slot,
    });
  return events.toSorted((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

export default function DashboardPage() {
  const { locale, t } = useI18n();
  const { user, isAuthenticated, isHydrated, isGuest } = useAuth();
  const canLoadDashboard = isHydrated && isAuthenticated;
  const loyalty = useQuery({
    queryKey: queryKeys.discounts.loyalty,
    queryFn: discountsApi.getLoyaltyAccount,
    enabled: canLoadDashboard && !isGuest,
  });
  const orders = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
    refetchInterval: 15000,
    enabled: canLoadDashboard,
  });
  const notifications = useQuery({
    queryKey: queryKeys.notifications.list(1),
    queryFn: () => notificationsApi.listNotifications(1),
    enabled: canLoadDashboard,
  });
  const subscriptions = useQuery({
    queryKey: queryKeys.payments.subscriptions,
    queryFn: paymentsApi.listSubscriptions,
    enabled: canLoadDashboard && !isGuest,
  });

  const activeOrders =
    orders.data?.results.filter(
      (order) => !TERMINAL_STATUSES.has(order.status),
    ) ?? [];
  const scheduledOrders = activeOrders.filter((order) => order.has_schedule);
  const scheduleQueries = useQueries({
    queries: scheduledOrders.map((order) => ({
      queryKey: queryKeys.schedule.detail(order.id),
      queryFn: () => scheduleApi.getSchedule(order.id),
      retry: false,
    })),
  });
  const nextEvent = scheduleQueries
    .map((query, index) =>
      query.data
        ? nextEventFromSchedule(scheduledOrders[index].id, query.data)
        : null,
    )
    .filter((event): event is NextEvent => event !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date))[0];
  const scheduleLoading = orders.isLoading || scheduleQueries.some((query) => query.isLoading);
  const scheduleError = orders.error || scheduleQueries.find((query) => query.error)?.error;
  const unread =
    notifications.data?.results.filter((item) => !item.is_read).length ?? 0;
  const subscription = currentSubscription(subscriptions.data ?? []);
  const recentOrders = orders.data?.results.slice(0, 4) ?? [];
  const displayName = user?.first_name || user?.phone_number || "there";

  return (
    <main className="mx-auto max-w-[1540px] px-3.5 pb-6 pt-4 sm:px-7 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0">
          <h1 className="font-display text-[1.7rem] font-light leading-[1.05] tracking-[-0.03em] break-words text-ink sm:text-[2.6rem]">
            {t("customerDashboard.welcome")},{" "}
            <span className="font-medium text-gold-600">{displayName}</span>
          </h1>
          <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted sm:mt-3 sm:text-[0.9375rem] sm:leading-relaxed">
            {t("customerDashboard.summary")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap">
          <Link href="/chat" className={buttonStyles({ variant: "secondary", className: "min-h-12 w-full whitespace-normal sm:w-auto" })}>
              <MessageCircle className="h-4 w-4 shrink-0" />
              {t("customerDashboard.help")}
            </Link>
          <Link href="/book" className={buttonStyles({ variant: "gold", className: "min-h-12 w-full whitespace-normal sm:w-auto" })}>
              {t("publicNav.book")} <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        {[orders, notifications, subscriptions].filter((query) => query.isError).map((query, index) => (
          <AccountError key={index} error={query.error} onRetry={() => { void query.refetch(); }} pending={query.isFetching} />
        ))}
      </div>

      <section
        className={`mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 ${isGuest ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
        aria-label="Account summary"
      >
        <KpiTile
          accent="blue"
          icon={ListChecks}
          label={t("customerDashboard.activeOrders")}
          value={orders.isLoading || orders.isError ? "—" : activeOrders.length}
          detail={t("customerDashboard.inProgress")}
        />
        <KpiTile
          accent="turquoise"
          icon={PackageCheck}
          label={t("customerDashboard.totalOrders")}
          value={orders.isLoading || orders.isError ? "—" : (orders.data?.count ?? 0)}
          detail={t("customerDashboard.allBookings")}
        />
        {!isGuest && <KpiTile
          accent="gold"
          icon={Coins}
          label={t("customerDashboard.points")}
          value={loyalty.isLoading || loyalty.isError ? "—" : (loyalty.data?.points_balance ?? 0)}
          detail={t("customerDashboard.redeem")}
        />}
        <KpiTile
          accent="coral"
          icon={Bell}
          label={t("customerDashboard.unread")}
          value={notifications.isLoading || notifications.isError ? "—" : unread}
          detail={notifications.isLoading || notifications.isError ? undefined : unread ? t("customerDashboard.attention") : t("customerDashboard.caughtUp")}
        />
      </section>

      <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="hero-navy relative overflow-hidden rounded-2xl text-white shadow-lift sm:rounded-[22px]">
          <div className="grid gap-3 p-4 sm:min-h-64 sm:grid-cols-[1fr_auto] sm:gap-6 sm:p-8">
            <div className="flex flex-col justify-between">
              <div>
                {scheduleLoading || scheduleError ? (
                  <>
                    <h2 className="font-display text-lg font-semibold sm:text-2xl">{t(scheduleLoading ? "customerDashboard.scheduleLoading" : "customerDashboard.scheduleUnavailable")}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/80">{t("customerDashboard.scheduleCheck")}</p>
                    {scheduleError && <button type="button" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline underline-offset-4" onClick={() => {
                      if (orders.isError) void orders.refetch();
                      scheduleQueries.filter((query) => query.isError).forEach((query) => { void query.refetch(); });
                    }}>{t("payments.retry")}</button>}
                  </>
                ) : nextEvent ? (
                  <>
                    <h2 className="mt-1.5 font-display text-lg font-semibold sm:mt-3 sm:max-w-none sm:text-2xl">
                      {t(`customerDashboard.${nextEvent.kind}Title`)}
                    </h2>
                    <p className="mt-1.5 text-xs leading-5 text-white/80 sm:mt-2 sm:max-w-lg sm:text-sm sm:leading-6">
                      {t("customerDashboard.order")} #{nextEvent.orderId} · {new Date(
                        `${nextEvent.date}T00:00:00`,
                      ).toLocaleDateString(locale, {
                        weekday: "long", month: "long", day: "numeric",
                      })} · {t(`customerDashboard.${TIME_SLOT_LABELS[nextEvent.timeSlot]}`)}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-1.5 font-display text-lg font-semibold sm:mt-3 sm:max-w-none sm:text-2xl">
                      {t("customerDashboard.noPickup")}
                    </h2>
                    <p className="mt-1.5 text-xs leading-5 text-white/80 sm:mt-2 sm:max-w-lg sm:text-sm sm:leading-6">
                      {t("customerDashboard.noPickupBody")}
                    </p>
                  </>
                )}
              </div>
              <Link
                href={scheduleLoading || scheduleError ? "/orders" : nextEvent ? `/orders/${nextEvent.orderId}` : "/book"}
                className="mt-3 inline-flex min-h-11 w-fit items-center gap-2 text-xs font-semibold text-gold hover:text-white sm:mt-6 sm:text-sm"
              >
                {scheduleLoading || scheduleError ? t("customerDashboard.viewAll") : nextEvent ? t("customerDashboard.details") : t("customerDashboard.schedule")}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
            <div className="hidden h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold/25 to-white/5 text-gold ring-1 ring-gold/30 backdrop-blur sm:grid sm:h-36 sm:w-36 sm:self-center sm:rounded-3xl">
              <Truck className="h-8 w-8 sm:h-16 sm:w-16" strokeWidth={1.5} />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-white/[0.05]">
            <div className="px-4 py-2.5 sm:p-4 sm:px-6">
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-turquoise" />
                {t("customerDashboard.openOrders")}
              </p>
              <p className="mt-0.5 font-display text-base font-semibold sm:mt-1 sm:text-xl">
                {orders.isLoading || orders.isError ? "—" : activeOrders.length}
              </p>
            </div>
            <div className="px-4 py-2.5 sm:p-4 sm:px-6">
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                {t("customerDashboard.currentPlan")}
              </p>
              <p className="mt-0.5 truncate font-display text-base font-semibold sm:mt-1 sm:text-xl">
                {isGuest
                  ? t("customerDashboard.accountRequired")
                  : subscriptions.isLoading || subscriptions.isError
                  ? "—"
                  : subscription
                  ? PLAN_LABELS[subscription.plan]
                  : t("customerDashboard.payAsYouGo")}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-3 sm:space-y-6">
          {isGuest ? (
            <Card className="card-gold rounded-2xl border-0 p-4 text-navy shadow-btn-gold sm:rounded-[22px] sm:p-5">
              <Sparkles className="h-5 w-5" />
              <h2 className="mt-3 font-display text-lg font-semibold">{t("customerDashboard.unlockTitle")}</h2>
              <p className="mt-1 text-sm text-navy/70">{t("customerDashboard.unlockBody")}</p>
              <Link href="/register" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold">{t("auth.create")} <ArrowRight className="h-4 w-4 shrink-0" /></Link>
            </Card>
          ) : null}
          {!isGuest && (loyalty.data ? (
            <MembershipCard
              tier={loyalty.data.badge_program.tier}
              pointsBalance={loyalty.data.points_balance}
            />
          ) : loyalty.isError ? (
            <AccountError error={loyalty.error} onRetry={() => { void loyalty.refetch(); }} pending={loyalty.isFetching} />
          ) : (
            <div className="h-36 animate-pulse rounded-xl bg-steam motion-reduce:animate-none" role="status" aria-label={t("orders.loading")} />
          ))}
        </div>
      </div>

      <section className="mt-3 overflow-hidden rounded-2xl border-0 bg-white shadow-card sm:mt-5 sm:rounded-[22px]">
        <div className="flex items-center justify-between gap-2 border-b border-crease bg-mist px-4 py-3 sm:gap-3 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-dashboard-blue-50 text-dashboard-blue sm:h-10 sm:w-10 sm:rounded-xl">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-medium text-ink sm:text-lg">
                {t("customerDashboard.recent")}
              </h2>
              <p className="mt-0.5 hidden text-sm text-ink-muted sm:block">
                {t("customerDashboard.recentBody")}
              </p>
            </div>
          </div>
          <Link
            href="/orders"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-navy shadow-sm ring-1 ring-crease transition-colors hover:bg-navy hover:text-white"
          >
            {t("customerDashboard.viewAll")}
          </Link>
        </div>
        {orders.isLoading ? (
          <div role="status" aria-label={t("orders.loading")} className="space-y-4 p-5">
            {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-xl bg-steam motion-reduce:animate-none" />)}
          </div>
        ) : orders.isError && !recentOrders.length ? (
          <p className="p-5 text-sm text-status-cancelled-text">{t("orders.loadError")}</p>
        ) : recentOrders.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink">{t("customerDashboard.noOrders")}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {t("customerDashboard.firstBooking")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-crease">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 px-4 py-3 transition-colors hover:bg-gold-50/50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3 sm:px-5 sm:py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {t("customerDashboard.order")} #{order.id}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {t("customerDashboard.placed")} {" "}
                    {new Date(order.created_at).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(order.total_amount)}
                </p>
                <StatusBadge
                  label={order.status}
                  tone={orderStatusTone(order.status)}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
