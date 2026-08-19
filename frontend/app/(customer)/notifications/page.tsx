"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { Button, Card, EyebrowLabel } from "@/components/ui";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { NotificationPreference } from "@/types";

type Filter = "all" | "unread";

const PREFERENCE_FIELDS: { key: keyof NotificationPreference; label: string; description: string }[] = [
    { key: "push_enabled", label: "Push notifications", description: "Order updates as they happen, right on your phone." },
    { key: "sms_enabled", label: "SMS", description: "Text messages for pickups, delivery, and payment confirmations." },
    { key: "whatsapp_enabled", label: "WhatsApp", description: "The same updates, sent to your WhatsApp instead." },
    { key: "email_enabled", label: "Email", description: "A copy of key updates sent to your email address." },
    { key: "promo_opt_in", label: "Promotions", description: "Occasional offers and loyalty rewards — nothing else." },
];

function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationsSkeleton() {
    return (
        <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
                <Card key={i} className="flex items-center gap-4">
                    <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-steam" />
                    <div className="flex-1 space-y-2">
                        <span className="block h-3 w-1/3 animate-pulse rounded bg-steam" />
                        <span className="block h-3 w-2/3 animate-pulse rounded bg-steam" />
                    </div>
                </Card>
            ))}
        </div>
    );
}

function PreferencesPanel() {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState<string | null>(null);

    const { data: preferences, isLoading } = useQuery({
        queryKey: queryKeys.notifications.preferences,
        queryFn: () => notificationsApi.getNotificationPreferences(),
    });

    const updateMutation = useMutation({
        mutationFn: (input: Partial<NotificationPreference>) =>
            notificationsApi.updateNotificationPreferences(input),
        onSuccess: (updated) => {
            queryClient.setQueryData(queryKeys.notifications.preferences, updated);
            setMessage(null);
        },
        onError: (error) => setMessage(getApiErrorMessage(error)),
    });

    if (isLoading) {
        return (
            <Card>
                <span className="block h-4 w-1/3 animate-pulse rounded bg-steam" />
            </Card>
        );
    }

    return (
        <Card>
            <h2 className="font-display mb-1 text-sm font-semibold text-navy">How we reach you</h2>
            <p className="mb-4 text-xs text-ink-muted">
                Choose which channels WEDEMBOYZ can use to notify you.
            </p>
            <div className="divide-y divide-crease">
                {PREFERENCE_FIELDS.map((field) => {
                    const checked = preferences?.[field.key] ?? false;
                    return (
                        <label
                            key={field.key}
                            className="flex cursor-pointer items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                        >
                            <div>
                                <p className="text-sm font-medium text-ink">{field.label}</p>
                                <p className="text-xs text-ink-muted">{field.description}</p>
                            </div>
                            <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={updateMutation.isPending}
                    onChange={(e) => updateMutation.mutate({ [field.key]: e.target.checked })}
                />
                <span className="absolute inset-0 rounded-full bg-crease transition-colors peer-checked:bg-navy peer-disabled:opacity-50" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </span>
                        </label>
                    );
                })}
            </div>
            {message && <p className="mt-3 text-xs text-status-cancelled-text">{message}</p>}
        </Card>
    );
}

export default function NotificationsPage() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<Filter>("all");

    const { notifications, isLoading, unreadCount, hasNextPage, hasPreviousPage, markRead, markAllRead } =
        useNotifications(page);

    const visibleNotifications =
        filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <EyebrowLabel words={["Stay in the loop"]} />
                    <h1 className="font-display mt-1 text-xl font-semibold text-navy">Notifications</h1>
                </div>
                {unreadCount > 0 && (
                    <Button variant="secondary" onClick={() => markAllRead()}>
                        Mark all as read
                    </Button>
                )}
            </div>

            <div className="mb-6 flex items-center gap-1 rounded-lg bg-steam p-1 text-sm">
                {(["all", "unread"] as Filter[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                            filter === tab ? "bg-white text-navy shadow-sm" : "text-ink-muted hover:text-ink"
                        }`}
                    >
                        {tab === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
                    </button>
                ))}
            </div>

            {isLoading && <NotificationsSkeleton />}

            {!isLoading && visibleNotifications.length === 0 && (
                <Card className="flex flex-col items-center gap-2 py-12 text-center">
                    <BellOff className="h-6 w-6 text-ink-muted" aria-hidden="true" />
                    <p className="text-sm font-medium text-ink">
                        {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                    </p>
                    <p className="max-w-xs text-xs text-ink-muted">
                        {filter === "unread"
                            ? "New updates about your orders and account will show up here."
                            : "We'll let you know here when there's something about your orders, payments, or account."}
                    </p>
                </Card>
            )}

            {!isLoading && visibleNotifications.length > 0 && (
                <ul className="space-y-2">
                    {visibleNotifications.map((notification) => {
                        const content = (
                            <Card
                                className={`flex items-start gap-4 transition-colors hover:bg-steam ${
                                    !notification.is_read ? "border-navy/15 bg-navy-50/40" : ""
                                }`}
                            >
                                <NotificationIcon type={notification.notification_type} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className={`text-sm ${!notification.is_read ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                                            {notification.title}
                                        </p>
                                        <span className="shrink-0 text-xs text-ink-muted">
                      {relativeTime(notification.created_at)}
                    </span>
                                    </div>
                                    {notification.body && (
                                        <p className="mt-0.5 text-sm text-ink-muted">{notification.body}</p>
                                    )}
                                </div>
                                {!notification.is_read && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />
                                )}
                            </Card>
                        );

                        return (
                            <li key={notification.id}>
                                {notification.related_order ? (
                                    <Link
                                        href={`/orders/${notification.related_order}`}
                                        onClick={() => !notification.is_read && markRead(notification.id)}
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        className="block w-full text-left"
                                        onClick={() => !notification.is_read && markRead(notification.id)}
                                    >
                                        {content}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {!isLoading && notifications.length > 0 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!hasPreviousPage}
                    >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        Previous
                    </Button>
                    <span className="text-xs text-ink-muted">Page {page}</span>
                    <Button
                        variant="secondary"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!hasNextPage}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            )}

            <div className="mt-10">
                <PreferencesPanel />
            </div>
        </main>
    );
}
