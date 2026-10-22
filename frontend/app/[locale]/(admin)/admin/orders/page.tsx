"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import { SearchInput } from "@/src/components/admin/SearchInput";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import {
  SortableTh,
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { useSort } from "@/src/components/admin/useSort";
import {
  Button,
  Select,
  StatusBadge,
  orderStatusTone,
  paymentStatusTone,
} from "@/src/components/ui";
import { ordersApi, staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { customerFullName, customerNumber } from "@/src/lib/utils";
import type {
  OrderListItem,
  OrderPaymentStatus,
  OrderStatus,
} from "@/src/types";

const STATUS_OPTIONS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "READY", label: "Ready" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_OPTIONS: { value: OrderPaymentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All payment states" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERPAID", label: "Overpaid" },
  { value: "NO_CHARGE", label: "No charge" },
  { value: "WAIVED", label: "Waived" },
  { value: "REFUNDED", label: "Refunded" },
];

const SOURCE_OPTIONS = ["ALL", "ONLINE", "WALK_IN", "PHONE", "STAFF"] as const;

type SortKey =
  "id" | "customer" | "phone_number" | "created_at" | "total_amount" | "status";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<
    OrderPaymentStatus | "ALL"
  >("ALL");
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_OPTIONS)[number]>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "NORMAL" | "EXPRESS" | "URGENT">("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");

  const staffQuery = useQuery({
    queryKey: ["staff", "operations"],
    queryFn: () => staffApi.listOperationalStaff(),
  });
  const staffNames = useMemo(
    () => new Map(staffQuery.data?.map((profile) => [profile.user.id, `${profile.user.first_name} ${profile.user.last_name}`.trim()]) ?? []),
    [staffQuery.data],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: [
      ...queryKeys.orders.list(page),
      { search, statusFilter, paymentFilter, sourceFilter },
    ],
    queryFn: () =>
      ordersApi.listOrders(page, {
        search: search.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        payment_status: paymentFilter === "ALL" ? undefined : paymentFilter,
        source: sourceFilter === "ALL" ? undefined : sourceFilter,
      }),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((order) => {
      const name = customerFullName(order.customer)?.toLowerCase() ?? "";
      const number = customerNumber(order.customer)?.toLowerCase() ?? "";
      const matchesSearch =
        term === "" ||
        String(order.id).includes(term) ||
        name.includes(term) ||
        number.includes(term);
      const matchesPriority = priorityFilter === "ALL" || order.priority === priorityFilter;
      const cutoff = periodFilter === "7" ? Date.now() - 7 * 864e5 : periodFilter === "30" ? Date.now() - 30 * 864e5 : 0;
      const matchesPeriod = !cutoff || new Date(order.created_at).getTime() >= cutoff;
      return matchesSearch && matchesPriority && matchesPeriod;
    });
  }, [data, search, priorityFilter, periodFilter]);

  const { sorted, toggle, directionFor } = useSort<OrderListItem, SortKey>(
    filtered,
    (row, key) => {
      switch (key) {
        case "id":
          return row.id;
        case "customer":
          return customerFullName(row.customer)?.toLowerCase() ?? "";
        case "phone_number":
          return customerNumber(row.customer) ?? "";
        case "created_at":
          return row.created_at;
        case "total_amount":
          return Number(row.total_amount);
        case "status":
          return row.status;
      }
    },
  );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Orders"
        description="Every customer's orders — staff see the same GET /orders/ list customers see, just unfiltered."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search this page by order # or customer name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search orders on this page"
        />
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "ALL")
          }
          className="sm:w-52"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className="sm:w-40" aria-label="Filter by priority">
          <option value="ALL">All priorities</option><option value="NORMAL">Normal</option><option value="EXPRESS">Express</option><option value="URGENT">Urgent</option>
        </Select>
        <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="sm:w-40" aria-label="Filter by date">
          <option value="ALL">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
        </Select>
        <Button variant="ghost" onClick={() => { setSearch(""); setStatusFilter("ALL"); setPaymentFilter("ALL"); setSourceFilter("ALL"); setPriorityFilter("ALL"); setPeriodFilter("ALL"); }}>Clear</Button>
        <Select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as (typeof SOURCE_OPTIONS)[number])}
          className="sm:w-40"
          aria-label="Filter by order source"
        >
          {SOURCE_OPTIONS.map((source) => (
            <option key={source} value={source}>
              {source === "ALL" ? "All sources" : source.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
        <Select
          value={paymentFilter}
          onChange={(e) =>
            setPaymentFilter(e.target.value as OrderPaymentStatus | "ALL")
          }
          className="sm:w-52"
          aria-label="Filter by payment status"
        >
          {PAYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {filtered?.length ?? 0} of {data.results.length} on this page ·{" "}
            {data.count} total
          </p>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      )}

      <TableContainer>
        <THead>
          <SortableTh
            label="Order"
            active={directionFor("id") !== null}
            direction={directionFor("id")}
            onSort={() => toggle("id")}
          />
          <Th>Source</Th>
          <SortableTh
            label="Customer"
            active={directionFor("customer") !== null}
            direction={directionFor("customer")}
            onSort={() => toggle("customer")}
          />
          <Th>Assigned</Th>
          <Th>Load</Th>
          <SortableTh
            label="Placed"
            active={directionFor("created_at") !== null}
            direction={directionFor("created_at")}
            onSort={() => toggle("created_at")}
          />
          <SortableTh
            label="Total"
            align="right"
            active={directionFor("total_amount") !== null}
            direction={directionFor("total_amount")}
            onSort={() => toggle("total_amount")}
          />
          <Th>Payment</Th>
          <SortableTh
            label="Status"
            active={directionFor("status") !== null}
            direction={directionFor("status")}
            onSort={() => toggle("status")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={10} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={10}>
              {data && data.results.length === 0
                ? "No orders yet."
                : "No orders match your search or filter."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((order) => (
              <Tr
                key={order.id}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <Td className="font-medium">
                  <p>{order.ticket_number ?? `#${order.id}`}</p>
                  {order.is_express && <span className="text-[10px] font-semibold uppercase tracking-wide text-status-pending-text">Express</span>}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-muted">
                  {order.source.replace(/_/g, " ")}
                </Td>
                <Td>
                  <span className="flex items-center gap-2"><CustomerAvatar name={customerFullName(order.customer) ?? `Customer ${order.id}`} size="sm" /><span>{customerFullName(order.customer) ?? <span className="text-ink-muted">—</span>}</span></span>
                </Td>
                <Td className="text-xs text-ink-muted">
                  <p>{order.assigned_to ? staffNames.get(order.assigned_to) ?? "Assigned" : "Unassigned"}</p>
                  {order.driver && <p>Driver: {staffNames.get(order.driver) ?? "Assigned"}</p>}
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {order.pieces_count} pc · {Number(order.weight_kg_total).toFixed(1)} kg
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(order.created_at).toLocaleString()}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(order.total_amount)}
                </Td>
                <Td>
                  <div className="space-y-1">
                    <StatusBadge
                      label={order.payment_status}
                      tone={paymentStatusTone(order.payment_status)}
                    />
                    {Number(order.balance_due) > 0 && (
                      <p className="text-xs tabular-nums text-ink-muted">
                        {formatCurrency(order.balance_due)} due
                      </p>
                    )}
                  </div>
                </Td>
                <Td>
                  <StatusBadge
                    label={order.status}
                    tone={orderStatusTone(order.status)}
                  />
                </Td>
                <Td>
                  <ChevronRight
                    className="h-4 w-4 text-ink-muted"
                    aria-hidden="true"
                  />
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {data && data.results.length === 0 && !isLoading && data.count === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Package className="h-3.5 w-3.5" aria-hidden="true" />
          Orders will show up here as soon as a customer books a pickup.
        </p>
      )}

      {data && (
        <Pagination
          currentPage={data.current_page}
          numPages={data.num_pages}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}
