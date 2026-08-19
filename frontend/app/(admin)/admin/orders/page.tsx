"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
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
} from "@/components/admin/Table";
import { useSort } from "@/components/admin/useSort";
import { Select, StatusBadge, orderStatusTone } from "@/components/ui";
import { ordersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import { customerFullName, customerNumber} from "@/lib/utils";
import type { OrderListItem, OrderStatus } from "@/types";

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

type SortKey = "id" | "customer" | "phone_number" | "created_at" | "total_amount" | "status";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(page),
    queryFn: () => ordersApi.listOrders(page),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((order) => {
        const name = customerFullName(order.customer)?.toLowerCase() ?? "";
        const number = customerNumber(order.customer)?.toLowerCase() ?? "";
      const matchesSearch = term === "" || String(order.id).includes(term) || name.includes(term) || number.includes(term);
      const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const { sorted, toggle, directionFor } = useSort<OrderListItem, SortKey>(filtered, (row, key) => {
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
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
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
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
          className="sm:w-52"
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {filtered?.length ?? 0} of {data.results.length} on this page · {data.count} total
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}

      <TableContainer>
        <THead>
          <SortableTh label="Order" active={directionFor("id") !== null} direction={directionFor("id")} onSort={() => toggle("id")} />
            <SortableTh
                label="Customer"
                active={directionFor("customer") !== null}
                direction={directionFor("customer")}
                onSort={() => toggle("customer")}
            /><SortableTh
            label="Phone Number"
            active={directionFor("phone_number") !== null}
            direction={directionFor("phone_number")}
            onSort={() => toggle("phone_number")}
        />
          <Th>Items</Th>
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
          <SortableTh
            label="Status"
            active={directionFor("status") !== null}
            direction={directionFor("status")}
            onSort={() => toggle("status")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={7} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={7}>
              {data && data.results.length === 0 ? "No orders yet." : "No orders match your search or filter."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((order) => (
              <Tr key={order.id} onClick={() => router.push(`/admin/orders/${order.id}`)}>
                <Td className="font-medium">#{order.id}</Td>
                <Td>{customerFullName(order.customer) ?? <span className="text-ink-muted">—</span>}</Td>
                  <Td>{customerNumber(order.customer) ?? <span className="text-ink-muted">—</span>}</Td>

                <Td className="text-ink-muted">
                  {order.item_count} item{order.item_count === 1 ? "" : "s"}
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">{new Date(order.created_at).toLocaleString()}</Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(order.total_amount)}
                </Td>
                <Td>
                  <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
                </Td>
                <Td>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
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

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
