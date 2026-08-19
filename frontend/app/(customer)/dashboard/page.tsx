"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, ChevronRight, Package, PackageCheck, Repeat, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MembershipCard } from "@/components/dashboard/MembershipCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button, Card, EyebrowLabel, StatusBadge, orderStatusTone } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { discountsApi, notificationsApi, ordersApi, paymentsApi, scheduleApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { currentSubscription } from "@/lib/subscriptions";
import type { Schedule, SubscriptionPlan, TimeSlot } from "@/types";

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

// Pickup/delivery legs in these states are done — nothing left to surface.
const FINISHED_SCHEDULE_STATUSES = new Set(["COMPLETED", "MISSED"]);

const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    MORNING: "Morning",
    MIDDAY: "Midday",
    AFTERNOON: "Afternoon",
    EVENING: "Evening",
};

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
    ESSENTIEL: "Pack Essentiel — 10kg/month",
    CONFORT: "Pack Confort — 20kg/month",
    FAMILLE: "Pack Famille — 30kg/month",
};

interface NextEvent {
    orderId: number;
    kind: "pickup" | "delivery";
    date: string;
    timeSlot: TimeSlot;
}

/** Picks whichever leg (pickup or delivery) of a schedule is still outstanding and soonest. */
function nextEventFromSchedule(orderId: number, schedule: Schedule): NextEvent | null {
    const candidates: NextEvent[] = [];

    if (!FINISHED_SCHEDULE_STATUSES.has(schedule.pickup_status)) {
        candidates.push({
            orderId,
            kind: "pickup",
            date: schedule.pickup_date,
            timeSlot: schedule.pickup_time_slot,
        });
    }
    if (!FINISHED_SCHEDULE_STATUSES.has(schedule.delivery_status)) {
        candidates.push({
            orderId,
            kind: "delivery",
            date: schedule.delivery_date,
            timeSlot: schedule.delivery_time_slot,
        });
    }

    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => a.date.localeCompare(b.date))[0];
}

export default function DashboardPage() {
    const { user } = useAuth();

    const { data: loyalty } = useQuery({
        queryKey: queryKeys.discounts.loyalty,
        queryFn: () => discountsApi.getLoyaltyAccount(),
    });

    const { data: orders } = useQuery({
        queryKey: queryKeys.orders.list(1),
        queryFn: () => ordersApi.listOrders(1),
    });

    const { data: notifications } = useQuery({
        queryKey: queryKeys.notifications.list(1),
        queryFn: () => notificationsApi.listNotifications(1),
    });

    const { data: subscriptions } = useQuery({
        queryKey: queryKeys.payments.subscriptions,
        queryFn: () => paymentsApi.listSubscriptions(),
    });

    // Active-order count only reflects the most recent page of results — an
    // honest approximation, not a dedicated backend aggregate. Fine while
    // customers realistically have under ~20 orders; revisit if that changes.
    const activeOrders = orders?.results.filter((o) => !TERMINAL_STATUSES.has(o.status)) ?? [];
    const activeCount = activeOrders.length;
    const recentOrders = orders?.results.slice(0, 3) ?? [];

    // Schedules aren't included on the order-list response, so the only active
    // orders' schedules are fetched individually to find the soonest upcoming
    // pickup or delivery. Fine at the realistic handful of concurrently-active
    // orders a customer has; revisit if that stops being true.
    const scheduleQueries = useQueries({
        queries: activeOrders.map((order) => ({
            queryKey: queryKeys.schedule.detail(order.id),
            queryFn: () => scheduleApi.getSchedule(order.id),
            retry: false,
        })),
    });

    const nextEvent = scheduleQueries
        .map((query, index) => (query.data ? nextEventFromSchedule(activeOrders[index].id, query.data) : null))
        .filter((event): event is NextEvent => event !== null)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

    // Same page-1 caveat as activeCount above — an approximation, not exact.
    const unreadCount = notifications?.results.filter((n) => !n.is_read).length ?? 0;

    // ACTIVE/PAUSED/PENDING, in that priority — not just ACTIVE, so a
    // customer who hasn't finished paying still sees a nudge here.
    const relevantSubscription = currentSubscription(subscriptions ?? []);

    return (
        <main className="mx-auto max-w-3xl px-6 py-10">
            <div className="mb-8 flex items-center gap-4">
                <Image style={{ width: "auto", height: "auto"}} src="/icon-mark.png" alt="" width={44} height={54} priority />
                <div>
                    <EyebrowLabel words={["Your account"]} />
                    <h1 className="font-display text-2xl font-semibold text-navy">
                        {user ? `Welcome back, ${user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.phone_number}` : "Dashboard"}
                    </h1>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={PackageCheck} label="Active orders" value={activeCount} />
                <StatCard icon={Package} label="Total orders" value={orders?.count ?? "—"} />
                <StatCard
                    icon={Sparkles}
                    label="Loyalty points"
                    value={loyalty?.points_balance ?? "—"}
                    accent="gold"
                />
                <Link href="/notifications">
                    <StatCard
                        icon={Bell}
                        label="Unread updates"
                        value={unreadCount}
                        accent={unreadCount > 0 ? "gold" : "navy"}
                        className="transition-colors hover:bg-steam"
                    />
                </Link>
            </div>

            {(nextEvent || relevantSubscription) && (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {nextEvent && (
                        <Link href={`/orders/${nextEvent.orderId}`}>
                            <Card className="flex h-full items-center gap-3 transition-colors hover:bg-steam">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy">
                                    <CalendarClock className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-ink">
                                        Next {nextEvent.kind} — Order #{nextEvent.orderId}
                                    </p>
                                    <p className="text-xs text-ink-muted">
                                        {new Date(nextEvent.date).toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })}{" "}
                                        · {TIME_SLOT_LABELS[nextEvent.timeSlot]}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            </Card>
                        </Link>
                    )}

                    {relevantSubscription && (
                        <Link href="/subscription">
                            <Card className="flex h-full items-center gap-3 transition-colors hover:bg-steam">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold">
                                    <Repeat className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-ink">
                                        {PLAN_LABELS[relevantSubscription.plan]}
                                    </p>
                                    <p className="text-xs text-ink-muted">
                                        {relevantSubscription.status === "PENDING"
                                            ? "Payment needed to activate"
                                            : relevantSubscription.status === "PAUSED"
                                              ? "Paused"
                                              : `${relevantSubscription.kg_remaining}kg remaining`}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            </Card>
                        </Link>
                    )}
                </div>
            )}

            {loyalty && (
                <div className="mb-6">
                    <MembershipCard tier={loyalty.tier} pointsBalance={loyalty.points_balance} />
                </div>
            )}

            <Link href="/book">
                <Button className="mb-8">Book a pickup</Button>
            </Link>

            <div className="mb-3 flex items-center justify-between">
                <EyebrowLabel words={["Recent orders"]} />
                <Link href="/orders" className="text-xs font-medium text-navy hover:underline">
                    View all
                </Link>
            </div>

            {recentOrders.length === 0 && <p className="mb-8 text-sm text-ink-muted">No orders yet.</p>}
            <ul className="mb-8 space-y-2">
                {recentOrders.map((order) => (
                    <li key={order.id}>
                        <Link href={`/orders/${order.id}`}>
                            <Card className="flex items-center justify-between transition-colors hover:bg-steam">
                                <div>
                                    <p className="text-sm font-medium text-ink">Order #{order.id}</p>
                                    <p className="text-xs text-ink-muted">
                                        {order.total_amount} {order.currency}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
                                    <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                                </div>
                            </Card>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}