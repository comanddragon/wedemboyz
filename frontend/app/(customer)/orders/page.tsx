"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { useAuth } from "@/src/hooks/useAuth";
import { formatCurrency } from "@/src/lib/constants";

import {
  Button,
  Card,
  StatusBadge,
  orderStatusTone,
} from "@/src/components/ui";
import { ordersApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";

export default function OrdersPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
  });

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><CustomerAvatar name={user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.phone_number : "Customer"} size="lg" /><div><h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">Your orders</h1><p className="text-sm text-ink-muted">Track every pickup, cleaning stage, and delivery.</p></div></div>
        <Link href="/book">
          <Button variant="secondary">+ Book a pickup</Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading...</p>}
      {error && (
        <p className="text-sm text-status-cancelled-text">
          Failed to load orders.
        </p>
      )}

      <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {data?.results.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:bg-steam">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Order #{order.id}
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
        <p className="text-sm text-ink-muted">No orders yet.</p>
      )}
    </main>
  );
}
