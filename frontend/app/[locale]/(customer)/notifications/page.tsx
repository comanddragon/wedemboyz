"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, ChevronLeft, ChevronRight } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { useState } from "react";

import { NotificationIcon } from "@/src/components/notifications/NotificationIcon";
import { Button, Card, EyebrowLabel } from "@/src/components/ui";
import { useNotifications } from "@/src/hooks/useNotifications";
import { notificationsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type { NotificationPreference } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";
import { enablePush } from "@/src/lib/pwa/service-worker";
import type { Locale } from "@/src/i18n/config";

type Filter = "all" | "unread";

const PREFERENCE_FIELDS: {
  key: keyof NotificationPreference;
  label: string;
  description: string;
}[] = [
  {
    key: "push_enabled",
    label: "Push notifications",
    description: "Order updates as they happen, right on your phone.",
  },
  {
    key: "sms_enabled",
    label: "SMS",
    description:
      "Text messages for pickups, delivery, and payment confirmations.",
  },
  {
    key: "whatsapp_enabled",
    label: "WhatsApp",
    description: "The same updates, sent to your WhatsApp instead.",
  },
  {
    key: "email_enabled",
    label: "Email",
    description: "A copy of key updates sent to your email address.",
  },
  {
    key: "promo_opt_in",
    label: "Promotions",
    description: "Occasional offers and loyalty rewards — nothing else.",
  },
];

function relativeTime(iso: string, locale: Locale): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  if (minutes < 1) return formatter.format(0, "minute");
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return formatter.format(-days, "day");
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

function NotificationsSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
  const { t } = useI18n();
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
      <h2 className="font-display mb-1 text-sm font-semibold text-navy">
        {t("notifications.reach")}
      </h2>
      <p className="mb-4 text-xs text-ink-muted">
        {t("notifications.reachBody")}
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
                <p className="text-sm font-medium text-ink">{t(({ push_enabled: "notifications.push", sms_enabled: "notifications.sms", whatsapp_enabled: "notifications.whatsapp", email_enabled: "notifications.email", promo_opt_in: "notifications.promos" } as Record<string, string>)[field.key])}</p>
                <p className="text-xs text-ink-muted">{t(({ push_enabled: "notifications.pushBody", sms_enabled: "notifications.smsBody", whatsapp_enabled: "notifications.whatsappBody", email_enabled: "notifications.emailBody", promo_opt_in: "notifications.promosBody" } as Record<string, string>)[field.key])}</p>
              </div>
              <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={updateMutation.isPending}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    // Permission must be requested from this click, not on login.
                    if (field.key === "push_enabled" && next) {
                      const result = await enablePush();
                      if (result === "denied" || result === "unsupported") {
                        setMessage(
                          t(
                            result === "denied"
                              ? "notifications.pushDenied"
                              : "notifications.pushUnsupported",
                          ),
                        );
                        return;
                      }
                    }
                    updateMutation.mutate({ [field.key]: next });
                  }}
                />
                <span className="absolute inset-0 rounded-full bg-crease transition-colors peer-checked:bg-navy peer-disabled:opacity-50" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          );
        })}
      </div>
      {message && (
        <p className="mt-3 text-xs text-status-cancelled-text">{message}</p>
      )}
    </Card>
  );
}

export default function NotificationsPage() {
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");

  const {
    notifications,
    isLoading,
    unreadCount,
    hasNextPage,
    hasPreviousPage,
    markRead,
    markAllRead,
  } = useNotifications(page);

  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <EyebrowLabel words={[t("notifications.eyebrow")]} />
          <h1 className="font-display mt-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {t("notifications.title")}
          </h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={() => markAllRead()}>
            {t("notifications.markAll")}
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-1 rounded-lg bg-steam p-1 text-sm">
        {(["all", "unread"] as Filter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
              filter === tab
                ? "bg-white text-navy shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab === "all"
              ? t("notifications.all")
              : `${t("notifications.unread")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {isLoading && <NotificationsSkeleton />}

      {!isLoading && visibleNotifications.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <BellOff className="h-6 w-6 text-ink-muted" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">
            {filter === "unread"
              ? t("notifications.caughtUp")
              : t("notifications.empty")}
          </p>
          <p className="max-w-xs text-xs text-ink-muted">
            {filter === "unread"
              ? t("notifications.caughtUpBody")
              : t("notifications.emptyBody")}
          </p>
        </Card>
      )}

      {!isLoading && visibleNotifications.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
                    <p
                      className={`text-sm ${!notification.is_read ? "font-semibold text-ink" : "font-medium text-ink"}`}
                    >
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {relativeTime(notification.created_at, locale)}
                    </span>
                  </div>
                  {notification.body && (
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {notification.body}
                    </p>
                  )}
                </div>
                {!notification.is_read && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold"
                    aria-label="Unread"
                  />
                )}
              </Card>
            );

            return (
              <li key={notification.id}>
                {notification.related_order ? (
                  <Link
                    href={`${isStaff ? "/admin" : ""}/orders/${notification.related_order}`}
                    onClick={() =>
                      !notification.is_read && markRead(notification.id)
                    }
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() =>
                      !notification.is_read && markRead(notification.id)
                    }
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
            {t("notifications.previous")}
          </Button>
          <span className="text-xs text-ink-muted">{t("notifications.page")} {page}</span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
          >
            {t("notifications.next")}
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
