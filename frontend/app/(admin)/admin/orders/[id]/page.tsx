"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import {
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import {
  Button,
  Card,
  Field,
  Select,
  ServiceIcon,
  StatusBadge,
  Textarea,
  orderStatusTone,
  serviceLabel,
} from "@/src/components/ui";
import { ordersApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { customerFullName } from "@/src/lib/utils";
import type { OrderStatus } from "@/src/types";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const [nextStatus, setNextStatus] = useState<OrderStatus>("CONFIRMED");
  const [note, setNote] = useState("");

  const statusMutation = useMutation({
    mutationFn: () =>
      ordersApi.updateOrderStatus(orderId, {
        status: nextStatus,
        note: note || undefined,
      }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to orders
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            Order #{order.id}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {customerFullName(order.customer) ?? `Customer #${order.user}`}
          </p>
        </div>
        <StatusBadge
          label={order.status}
          tone={orderStatusTone(order.status)}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-0">
          <div className="space-y-1 p-5 pb-4 text-sm text-ink-muted">
            <p>Pickup: {order.pickup_address}</p>
            <p>Delivery: {order.delivery_address}</p>
            {order.notes && <p>Notes: {order.notes}</p>}
          </div>

          <TableContainer className="rounded-none border-x-0 border-b-0">
            <THead>
              <Th>Item</Th>
              <Th>Service</Th>
              <Th align="right">Weight</Th>
              <Th align="right">Qty</Th>
              <Th align="right">Subtotal</Th>
            </THead>
            <TBody>
              {order.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-navy">
                        <ServiceIcon type={item.service_type} />
                      </span>
                      <div>
                        <p className="font-medium text-ink">
                          {item.label || serviceLabel(item.service_type)}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink-muted">
                    {serviceLabel(item.service_type)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {item.weight_kg}kg
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {item.quantity}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </TableContainer>

          <div className="space-y-1 p-5 pt-4 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Discount</span>
              <span className="tabular-nums">
                -{formatCurrency(order.discount_amount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Delivery fee</span>
              <span className="tabular-nums">
                {formatCurrency(order.delivery_fee)}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display mb-3 text-sm font-medium text-ink">
              Update status
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                statusMutation.mutate();
              }}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="New status" htmlFor="next-status">
                  <Select
                    id="next-status"
                    value={nextStatus}
                    onChange={(e) =>
                      setNextStatus(e.target.value as OrderStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Note"
                  htmlFor="status-note"
                  hint="Optional — visible in this order's status history."
                >
                  <Textarea
                    id="status-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={1}
                  />
                </Field>
              </div>
              <Button
                type="submit"
                className="mt-1"
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? "Updating..." : "Update status"}
              </Button>
            </form>
            {statusMutation.error && (
              <p className="mt-2 text-sm text-status-cancelled-text">
                {getApiErrorMessage(statusMutation.error)}
              </p>
            )}
          </Card>

          <Card className="p-0">
            <h2 className="font-display p-5 pb-3 text-sm font-medium text-ink">
              Status history
            </h2>
            {order.status_history.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-muted">
                No status changes yet.
              </p>
            ) : (
              <TableContainer className="rounded-none border-x-0 border-b-0">
                <THead>
                  <Th>Status</Th>
                  <Th>Changed by</Th>
                  <Th>Note</Th>
                  <Th align="right">When</Th>
                </THead>
                <TBody>
                  {order.status_history.map((entry, i) => (
                    <Tr key={entry.id ?? i}>
                      <Td>
                        <StatusBadge
                          label={entry.status}
                          tone={orderStatusTone(entry.status)}
                        />
                      </Td>
                      <Td className="text-ink-muted">
                        {entry.changed_by ?? "—"}
                      </Td>
                      <Td className="text-ink-muted">{entry.note || "—"}</Td>
                      <Td
                        align="right"
                        className="whitespace-nowrap text-ink-muted"
                      >
                        {new Date(entry.created_at).toLocaleString()}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </TableContainer>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
