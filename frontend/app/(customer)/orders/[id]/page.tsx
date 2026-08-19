"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
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
} from "@/components/ui";
import { ordersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import { EDITABLE_ORDER_STATUSES } from "@/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
  });

  if (isLoading) return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  if (error || !order) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const canCancel = EDITABLE_ORDER_STATUSES.includes(order.status) || order.status === "CONFIRMED";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/orders" className="mb-4 inline-block text-sm text-ink-muted hover:text-ink">
        &larr; Back to orders
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-navy">Order #{order.id}</h1>
        <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
      </div>

      <Card>
        <p className="text-sm text-ink-muted">Pickup: {order.pickup_address}</p>
        <p className="text-sm text-ink-muted">Delivery: {order.delivery_address}</p>
        {order.notes && <p className="text-sm text-ink-muted">Notes: {order.notes}</p>}

        <CreaseDivider />

        <h2 className="font-display mb-3 text-sm font-medium text-ink">Items</h2>
        <ul className="mb-4 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="mt-0.5 text-navy">
                <ServiceIcon type={item.service_type} />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-medium text-ink">{item.label || serviceLabel(item.service_type)}</p>
                <p className="text-xs text-ink-muted">
                  {serviceLabel(item.service_type)} — {item.weight_kg}kg x{item.quantity} — {item.subtotal} XAF
                </p>
                {item.description && <p className="mt-1 text-xs text-ink-muted">{item.description}</p>}
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span>{order.subtotal} XAF</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Discount</span>
            <span>-{order.discount_amount} XAF</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Delivery fee</span>
            <span>{order.delivery_fee} XAF</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold text-navy">
            <span>Total</span>
            <span>
              {order.total_amount} {order.currency}
            </span>
          </div>
        </div>

        <CreaseDivider />

        <h2 className="font-display mb-3 text-sm font-medium text-ink">Status history</h2>
        <ul className="space-y-1 text-sm text-ink-muted">
          {order.status_history.map((entry, i) => (
            <li key={i}>
              {entry.status} — {new Date(entry.created_at).toLocaleString()}
              {entry.note && ` — ${entry.note}`}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        {canCancel && (
          <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? "Cancelling..." : "Cancel order"}
          </Button>
        )}
        <Button variant="secondary" onClick={() => router.push("/chat")}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Ask a question
        </Button>
      </div>
      {cancelMutation.error && (
        <p className="mt-2 text-sm text-status-cancelled-text">{getApiErrorMessage(cancelMutation.error)}</p>
      )}
    </main>
  );
}
