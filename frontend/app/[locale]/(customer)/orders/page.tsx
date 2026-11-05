"use client";
import { buttonStyles } from "@/src/components/ui/Button";
import { OrderItemPreviews } from "@/src/components/orders/OrderItemPreviews";

import { useState } from "react";
import { Pagination } from "@/src/components/admin/Pagination";
import { AccountError } from "@/src/components/dashboard/AccountError";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { useAuth } from "@/src/hooks/useAuth";
import { formatCurrency } from "@/src/lib/constants";

import {
  Card,
  StatusBadge,
  paymentStatusTone,
  orderStatusTone,
} from "@/src/components/ui";
import { ordersApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function OrdersPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.orders.list(page),
    queryFn: () => ordersApi.listOrders(page),
    refetchInterval: 15000,
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><CustomerAvatar name={user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.phone_number : t("common.customer")} size="lg" imageUrl={user?.avatar} useProfilePhoto={user?.use_profile_photo} /><div><h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">{t("orders.title")}</h1><p className="text-sm text-ink-muted">{t("orders.subtitle")}</p></div></div>
        <Link href="/book" className={buttonStyles({ variant: "secondary" })}>{t("orders.book")}</Link>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">{t("orders.loading")}</p>}
      {error && (
        <div className="mb-4"><AccountError error={error} onRetry={() => { void refetch(); }} pending={isFetching} /></div>
      )}

      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {data?.results.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`} className="block h-full rounded-2xl focus-visible:outline-navy">
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
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
                  <StatusBadge
                    label={order.payment_status}
                    tone={paymentStatusTone(order.payment_status)}
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
      {data && !error && data.results.length === 0 && (
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-ink-muted">{t("orders.empty")}</p>
          <Link href="/book" className={buttonStyles({ variant: "gold" })}>{t("orders.book")}</Link>
        </Card>
      )}
      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
