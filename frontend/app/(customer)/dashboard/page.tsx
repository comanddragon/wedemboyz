"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Coins,
  ListChecks,
  MessageCircle,
  PackageCheck,
  Repeat,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { KpiTile } from "@/src/components/dashboard/KpiTile";
import { MembershipCard } from "@/src/components/dashboard/MembershipCard";
import {
  Button,
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

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
const FINISHED_SCHEDULE_STATUSES = new Set(["COMPLETED", "MISSED"]);
const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  MORNING: "Morning",
  MIDDAY: "Midday",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
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
  const { user } = useAuth();
  const loyalty = useQuery({
    queryKey: queryKeys.discounts.loyalty,
    queryFn: discountsApi.getLoyaltyAccount,
  });
  const orders = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
  });
  const notifications = useQuery({
    queryKey: queryKeys.notifications.list(1),
    queryFn: () => notificationsApi.listNotifications(1),
  });
  const subscriptions = useQuery({
    queryKey: queryKeys.payments.subscriptions,
    queryFn: paymentsApi.listSubscriptions,
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
  const unread =
    notifications.data?.results.filter((item) => !item.is_read).length ?? 0;
  const subscription = currentSubscription(subscriptions.data ?? []);
  const recentOrders = orders.data?.results.slice(0, 4) ?? [];
  const displayName = user?.first_name || user?.phone_number || "there";

  return (
    <main className="mx-auto max-w-[1540px] px-3.5 pb-6 pt-4 sm:px-7 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div>
          <h1 className="font-display text-[1.7rem] font-light leading-[1.05] tracking-[-0.03em] text-ink sm:text-[2.6rem]">
            Welcome back,{" "}
            <span className="font-medium text-gold-600">{displayName}</span>
          </h1>
          <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted sm:mt-3 sm:text-[0.9375rem] sm:leading-relaxed">
            Your orders, next pickup, payments and rewards at a glance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href="/chat" className="contents sm:block">
            <Button
              variant="secondary"
              className="min-h-12 w-full sm:min-h-0 sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Get help
            </Button>
          </Link>
          <Link href="/book" className="contents sm:block">
            <Button
              variant="gold"
              className="min-h-12 w-full sm:min-h-0 sm:w-auto"
            >
              Book a pickup <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section
        className="mt-4 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 xl:grid-cols-4"
        aria-label="Account summary"
      >
        <KpiTile
          accent="blue"
          icon={ListChecks}
          label="Active orders"
          value={activeOrders.length}
          detail="Currently in progress"
        />
        <KpiTile
          accent="turquoise"
          icon={PackageCheck}
          label="Total orders"
          value={orders.isLoading ? "—" : (orders.data?.count ?? 0)}
          detail="All-time bookings"
        />
        <KpiTile
          accent="gold"
          icon={Coins}
          label="Reward points"
          value={loyalty.isLoading ? "—" : (loyalty.data?.points_balance ?? 0)}
          detail="Available to redeem"
        />
        <KpiTile
          accent="coral"
          icon={Bell}
          label="Unread updates"
          value={notifications.isLoading ? "—" : unread}
          detail={unread ? "Needs your attention" : "You are all caught up"}
        />
      </section>

      <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <section className="hero-navy relative overflow-hidden rounded-2xl text-white shadow-lift sm:rounded-[22px]">
          <div className="grid gap-3 p-4 sm:min-h-64 sm:grid-cols-[1fr_auto] sm:gap-6 sm:p-8">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                  What’s next
                </p>
                {nextEvent ? (
                  <>
                    <h2 className="mt-1.5 max-w-[75%] font-display text-lg font-semibold sm:mt-3 sm:max-w-none sm:text-2xl">
                      Your {nextEvent.kind} is coming up
                    </h2>
                    <p className="mt-1.5 max-w-[78%] text-xs leading-5 text-white/65 sm:mt-2 sm:max-w-lg sm:text-sm sm:leading-6">
                      Order #{nextEvent.orderId} is scheduled for{" "}
                      {new Date(
                        `${nextEvent.date}T00:00:00`,
                      ).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                      , during the{" "}
                      {TIME_SLOT_LABELS[nextEvent.timeSlot].toLowerCase()}{" "}
                      window.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-1.5 max-w-[75%] font-display text-lg font-semibold sm:mt-3 sm:max-w-none sm:text-2xl">
                      No pickup is currently scheduled
                    </h2>
                    <p className="mt-1.5 max-w-[78%] text-xs leading-5 text-white/65 sm:mt-2 sm:max-w-lg sm:text-sm sm:leading-6">
                      When you book or staff confirm a schedule, the next
                      important date will appear here.
                    </p>
                  </>
                )}
              </div>
              <Link
                href={nextEvent ? `/orders/${nextEvent.orderId}` : "/book"}
                className="mt-3 inline-flex w-fit items-center gap-2 text-xs font-semibold text-gold hover:text-white sm:mt-6 sm:text-sm"
              >
                {nextEvent ? "View order details" : "Schedule a pickup"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="absolute right-4 top-10 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold/25 to-white/5 text-gold ring-1 ring-gold/30 backdrop-blur sm:static sm:h-36 sm:w-36 sm:self-center sm:rounded-3xl">
              <Truck className="h-8 w-8 sm:h-16 sm:w-16" strokeWidth={1.5} />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 bg-white/[0.05]">
            <div className="px-4 py-2.5 sm:p-4 sm:px-6">
              <p className="flex items-center gap-1.5 text-xs text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-turquoise" />
                Open orders
              </p>
              <p className="mt-0.5 font-display text-base font-semibold sm:mt-1 sm:text-xl">
                {activeOrders.length}
              </p>
            </div>
            <div className="px-4 py-2.5 sm:p-4 sm:px-6">
              <p className="flex items-center gap-1.5 text-xs text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Current plan
              </p>
              <p className="mt-0.5 truncate font-display text-base font-semibold sm:mt-1 sm:text-xl">
                {subscription
                  ? PLAN_LABELS[subscription.plan]
                  : "Pay as you go"}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-3 sm:space-y-6">
          {subscription ? (
            <Link href="/subscription">
              <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-turquoise-50 via-white to-white p-4 text-navy shadow-card transition-all hover:-translate-y-0.5 sm:rounded-[22px] sm:p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-turquoise-50 text-turquoise-600 ring-1 ring-turquoise/20">
                    <Repeat className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-status-ready-bg px-2.5 py-1 text-xs font-semibold capitalize text-status-ready-text">
                    {subscription.status.toLowerCase()}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-base font-semibold sm:mt-6 sm:text-xl">
                  {PLAN_LABELS[subscription.plan]}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {subscription.status === "ACTIVE"
                    ? `${subscription.kg_remaining}kg remaining this cycle`
                    : subscription.status === "PENDING"
                      ? "Payment is needed to activate your plan"
                      : "Your subscription is currently paused"}
                </p>
              </Card>
            </Link>
          ) : (
            <Card className="card-gold rounded-2xl border-0 p-4 text-navy shadow-btn-gold sm:rounded-[22px] sm:p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/40">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="mt-2 font-display text-base font-semibold sm:mt-4 sm:text-xl">
                Laundry plans
              </h2>
              <p className="mt-1 text-sm text-navy/70">
                Save time with a monthly kilogram allowance.
              </p>
              <Link
                href="/subscription"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold sm:mt-4 sm:text-sm"
              >
                Explore plans <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          )}
          {loyalty.data ? (
            <MembershipCard
              tier={loyalty.data.tier}
              pointsBalance={loyalty.data.points_balance}
            />
          ) : (
            <div className="h-36 animate-pulse rounded-xl bg-steam" />
          )}
        </div>
      </div>

      <section className="mt-3 overflow-hidden rounded-2xl border-0 bg-white shadow-card sm:mt-5 sm:rounded-[22px]">
        <div className="flex items-center justify-between gap-2 border-b border-crease bg-gradient-to-r from-dashboard-blue-50/70 to-transparent px-4 py-3 sm:gap-3 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-dashboard-blue-50 text-dashboard-blue sm:h-10 sm:w-10 sm:rounded-xl">
              <PackageCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-medium text-ink sm:text-lg">
                Recent orders
              </h2>
              <p className="mt-0.5 hidden text-sm text-ink-muted sm:block">
                Status and value of your latest laundry requests
              </p>
            </div>
          </div>
          <Link
            href="/orders"
            className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-navy shadow-sm ring-1 ring-crease transition-colors hover:bg-navy hover:text-white"
          >
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink">No orders yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              Your first booking will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-crease">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-1.5 px-4 py-3 transition-colors hover:bg-gold-50/50 sm:grid-cols-[1fr_auto_auto] sm:gap-3 sm:px-5 sm:py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    Order #{order.id}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Placed{" "}
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-ink">
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
