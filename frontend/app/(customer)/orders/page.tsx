"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button, Card, StatusBadge, orderStatusTone } from "@/components/ui";
import { ordersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function OrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-navy">Your orders</h1>
        <Link href="/book">
          <Button variant="secondary">+ Book a pickup</Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading...</p>}
      {error && <p className="text-sm text-status-cancelled-text">Failed to load orders.</p>}

      <ul className="space-y-2">
        {data?.results.map((order) => (
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
      {data && data.results.length === 0 && <p className="text-sm text-ink-muted">No orders yet.</p>}
    </main>
  );
}
