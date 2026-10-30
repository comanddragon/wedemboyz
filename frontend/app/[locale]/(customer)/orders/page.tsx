"use client";
import { buttonStyles } from "@/src/components/ui/Button";
import { OrderItemPreviews } from "@/src/components/orders/OrderItemPreviews";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { useAuth } from "@/src/hooks/useAuth";
import { formatCurrency } from "@/src/lib/constants";

import {
  Card,
  StatusBadge,
  orderStatusTone,
} from "@/src/components/ui";
import { ordersApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function OrdersPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><CustomerAvatar name={user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.phone_number : t("common.customer")} size="lg" imageUrl={user?.avatar} useProfilePhoto={user?.use_profile_photo} /><div><h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">{t("orders.title")}</h1><p className="text-sm text-ink-muted">{t("orders.subtitle")}</p></div></div>
        <Link href="/book" className={buttonStyles({ variant: "secondary" })}>{t("orders.book")}</Link>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">{t("orders.loading")}</p>}
      {error && (
        <p className="text-sm text-status-cancelled-text">
          {t("orders.loadError")}
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {data?.results.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`}>
              <Card className="flex h-full flex-wrap items-center justify-between gap-3 transition-colors hover:bg-steam">
                <OrderItemPreviews items={order.items} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {t("orders.order")} #{order.id}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={order.status}
                    tone={orderStatusTone(order.status)}
                  />
                  <ChevronRight
                    className="h-4 w-4 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {data && data.results.length === 0 && (
        <p className="text-sm text-ink-muted">{t("orders.empty")}</p>
      )}
    </main>
  );
}
