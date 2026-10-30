"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  MapPin,
  MessageCircle,
  PackageCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { PaymentSummary } from "@/src/components/payments/PaymentSummary";
import { collectionMethods } from "@/src/lib/payment-options";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

import {
  Button,
  Card,
  CreaseDivider,
  ServiceIcon,
  StatusBadge,
  orderStatusTone,
  serviceLabel,
} from "@/src/components/ui";
import { chatApi, ordersApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import { EDITABLE_ORDER_STATUSES } from "@/src/types";

export default function OrderDetailPage() {
  const { locale, t } = useI18n();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });

  const orderChatMutation = useMutation({
    mutationFn: async () => {
      const rooms = await chatApi.listChatRooms();
      const existing = rooms.find((room) => room.order?.id === orderId);
      return existing ?? chatApi.createChatRoom({ order: orderId });
    },
    onSuccess: (room) => router.push(`/chat/${room.id}`),
  });

  if (isLoading)
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        {t("orders.loading")}
      </main>
    );
  if (error || !order) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  const canCancel =
    EDITABLE_ORDER_STATUSES.includes(order.status) ||
    order.status === "CONFIRMED";
  // Line items are the source of truth. Older orders may still have stale
  // denormalised summary columns until the repair migration is deployed.
  const piecesCount = order.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
  const weightKgTotal = order.items.reduce(
    (total, item) =>
      total + Number(item.weight_kg || 0) * Number(item.quantity || 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/orders"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        &larr; {t("orders.back")}
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {order.ticket_number ?? `${t("orders.order")} #${order.id}`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("orders.placed")} {new Date(order.created_at).toLocaleString(locale)}
          </p>
        </div>
        <StatusBadge
          label={order.status}
          tone={orderStatusTone(order.status)}
        />
      </div>

      <section className="mb-6 grid overflow-hidden rounded-2xl border border-crease bg-white sm:grid-cols-3">
        {[
          {
            icon: PackageCheck,
            label: t("orders.load"),
            value: `${piecesCount} ${t("orders.pieces")} · ${weightKgTotal.toFixed(1)} kg`,
          },
          {
            icon: WalletCards,
            label: t("orders.amountDue"),
            value: formatCurrency(order.balance_due),
          },
          {
            icon: CalendarDays,
            label: t("orders.updated"),
            value: new Date(order.updated_at).toLocaleDateString(locale),
          },
        ].map(({ icon: Icon, label, value }, index) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-5 py-4 ${index ? "border-t border-crease sm:border-l sm:border-t-0" : ""}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50 text-navy">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] text-ink-muted">{label}</p>
              <p className="text-sm font-semibold text-navy">{value}</p>
            </div>
          </div>
        ))}
      </section>

      <Card className="mb-6">
        <PaymentSummary status={order.payment_status} total={order.total_amount} paid={order.amount_paid} balance={order.balance_due} />
        <p className="mt-4 text-sm font-medium text-navy">{collectionMethods(locale).find((method) => method.value === order.payment_option)?.label}</p>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-crease bg-steam/30 p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              {t("orders.items")}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {t("orders.itemsBody")}
            </p>
          </div>

          <CreaseDivider />

          <ul className="divide-y divide-crease">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                {(item.photos[0]?.image ?? item.photo) ? (
                  <Link
                    href={`/orders/${orderId}/items/${item.id}`}
                                                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-steam"
                  >
                    <Image
                      src={item.photos[0]?.image ?? item.photo ?? ""}
                      alt={item.label || serviceLabel(item.service_type)}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {item.photos.length > 1 ? (
                      <span className="absolute bottom-1 right-1 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                        +{item.photos.length - 1}
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy">
                    <ServiceIcon type={item.service_type} />
                  </span>
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium text-ink">
                    <Link className="underline underline-offset-4" href={`/orders/${orderId}/items/${item.id}`}>
{item.label || serviceLabel(item.service_type)}
</Link>
                  </p>
                  <p className="text-xs text-ink-muted">
                    {serviceLabel(item.service_type)} — {item.weight_kg}kg x
                    {item.quantity} — {formatCurrency(item.subtotal)}
                  </p>
                  {item.description && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.description}
                    </p>
                  )}
                  <StatusBadge
                    label={item.status}
                    tone={item.status === "PACKED" ? "ready" : "progress"}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-crease bg-steam/25 p-5 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>{t("orders.subtotal")}</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("orders.discount")}</span>
              <span>-{formatCurrency(order.discount_amount)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("orders.deliveryFee")}</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>{t("orders.total")}</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold text-navy">
              {t("orders.pickupDelivery")}
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    {t("orders.pickupAddress")}
                  </p>
                  <p className="text-ink">{order.pickup_address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    {t("orders.deliveryAddress")}
                  </p>
                  <p className="text-ink">{order.delivery_address}</p>
                </div>
              </div>
              {order.notes ? (
                <div className="rounded-xl bg-gold-50 px-3 py-2 text-sm text-gold-600">
                  <strong>{t("orders.note")}:</strong> {order.notes}
                </div>
              ) : null}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold text-navy">
              {t("orders.progress")}
            </h2>
            <ul className="space-y-4 text-sm text-ink-muted">
              {order.status_history.map((entry, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <StatusBadge
                      label={entry.status}
                      tone={orderStatusTone(entry.status)}
                    />
                    <p className="mt-1 text-xs">
                      {new Date(entry.created_at).toLocaleString(locale)}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 text-xs text-ink">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {canCancel && (
          <Button
            variant="danger"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? t("orders.cancelling") : t("orders.cancel")}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => orderChatMutation.mutate()}
          disabled={orderChatMutation.isPending}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {orderChatMutation.isPending ? t("orders.loading") : t("orders.question")}
        </Button>
      </div>
      {cancelMutation.error && (
        <p className="mt-2 text-sm text-status-cancelled-text">
          {getApiErrorMessage(cancelMutation.error)}
        </p>
      )}
      {orderChatMutation.error && (
        <p className="mt-2 text-sm text-status-cancelled-text">
          {getApiErrorMessage(orderChatMutation.error)}
        </p>
      )}
    </main>
  );
}
