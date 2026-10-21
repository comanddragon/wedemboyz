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
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  Button,
  Card,
  CreaseDivider,
  ServiceIcon,
  StatusBadge,
  orderStatusTone,
  serviceLabel,
} from "@/src/components/ui";
import { ordersApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { EDITABLE_ORDER_STATUSES } from "@/src/types";

export default function OrderDetailPage() {
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

  if (isLoading)
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
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

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/orders"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        &larr; Back to orders
      </Link>

      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {order.ticket_number ?? `Order #${order.id}`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Placed {new Date(order.created_at).toLocaleString()}
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
            label: "Laundry load",
            value: `${order.pieces_count} pieces · ${Number(order.weight_kg_total).toFixed(1)} kg`,
          },
          {
            icon: WalletCards,
            label: "Amount due",
            value: formatCurrency(order.balance_due),
          },
          {
            icon: CalendarDays,
            label: "Last updated",
            value: new Date(order.updated_at).toLocaleDateString(),
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

      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-crease bg-steam/30 p-5">
            <h2 className="font-display text-lg font-semibold text-navy">
              Your items
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Photos and care details submitted with this order.
            </p>
          </div>

          <CreaseDivider />

          <ul className="divide-y divide-crease">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                {(item.photos[0]?.image ?? item.photo) ? (
                  <a
                    href={item.photos[0]?.image ?? item.photo ?? ""}
                    target="_blank"
                    rel="noreferrer"
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
                  </a>
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy">
                    <ServiceIcon type={item.service_type} />
                  </span>
                )}
                <div className="flex-1 text-sm">
                  <p className="font-medium text-ink">
                    {item.label || serviceLabel(item.service_type)}
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
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount_amount)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Delivery fee</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold text-navy">
              Pickup & delivery
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    Pickup address
                  </p>
                  <p className="text-ink">{order.pickup_address}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    Delivery address
                  </p>
                  <p className="text-ink">{order.delivery_address}</p>
                </div>
              </div>
              {order.notes ? (
                <div className="rounded-xl bg-gold-50 px-3 py-2 text-sm text-gold-600">
                  <strong>Your note:</strong> {order.notes}
                </div>
              ) : null}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold text-navy">
              Order progress
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
                      {new Date(entry.created_at).toLocaleString()}
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

      <div className="mt-6 flex items-center gap-3">
        {canCancel && (
          <Button
            variant="danger"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel order"}
          </Button>
        )}
        <Button variant="secondary" onClick={() => router.push("/chat")}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Ask a question
        </Button>
      </div>
      {cancelMutation.error && (
        <p className="mt-2 text-sm text-status-cancelled-text">
          {getApiErrorMessage(cancelMutation.error)}
        </p>
      )}
    </main>
  );
}
