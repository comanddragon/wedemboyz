"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import { SearchInput } from "@/src/components/admin/SearchInput";
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
import { Tabs } from "@/src/components/admin/Tabs";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { useSort } from "@/src/components/admin/useSort";
import { Select, StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { Payment, PaymentMethodType, PaymentStatus } from "@/src/types";
import { customerFullName, customerNumber } from "@/src/lib/utils";

const METHOD_LABELS: Record<PaymentMethodType, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

const STATUS_OPTIONS: { value: PaymentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCEEDED", label: "Succeeded" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
];

type SortKey =
  | "id"
  | "order"
  | "customer"
  | "phone_number"
  | "amount"
  | "status"
  | "created_at";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">(
    "ALL",
  );

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.payments.list(page),
    queryFn: () => paymentsApi.listPayments(page),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((p) => {
      const name = customerFullName(p.customer)?.toLowerCase() ?? "";
      const number = customerNumber(p.customer)?.toLowerCase() ?? "";
      const matchesSearch =
        term === "" ||
        String(p.id).includes(term) ||
        (p.order !== null && String(p.order).includes(term)) ||
        name.includes(term) ||
        number.includes(term);
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const { sorted, toggle, directionFor } = useSort<Payment, SortKey>(
    filtered,
    (row, key) => {
      switch (key) {
        case "id":
          return row.id;
        case "customer":
          return customerFullName(row.customer)?.toLowerCase() ?? "";
        case "phone_number":
          return customerNumber(row.customer) ?? "";
        case "order":
          return row.order ?? "";
        case "amount":
          return Number(row.amount);
        case "status":
          return row.status;
        case "created_at":
          return row.created_at;
      }
    },
  );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Payments"
        description="Manual ledger of money received from customers."
      />

      <Tabs
        items={[
          { href: "/admin/payments", label: "Payments" },
          { href: "/admin/payments/refunds", label: "Refunds" },
          { href: "/admin/payments/invoices", label: "Invoices" },
        ]}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search this page by payment # or order #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search payments on this page"
        />
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PaymentStatus | "ALL")
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
            label="Payment"
            active={directionFor("id") !== null}
            direction={directionFor("id")}
            onSort={() => toggle("id")}
          />
          <SortableTh
            label="Order"
            active={directionFor("order") !== null}
            direction={directionFor("order")}
            onSort={() => toggle("order")}
          />
          <SortableTh
            label="Customer"
            active={directionFor("customer") !== null}
            direction={directionFor("customer")}
            onSort={() => toggle("customer")}
          />
          <SortableTh
            label="Phone Number"
            active={directionFor("phone_number") !== null}
            direction={directionFor("phone_number")}
            onSort={() => toggle("phone_number")}
          />
          <Th>Method</Th>
          <SortableTh
            label="Amount"
            align="right"
            active={directionFor("amount") !== null}
            direction={directionFor("amount")}
            onSort={() => toggle("amount")}
          />
          <SortableTh
            label="Status"
            active={directionFor("status") !== null}
            direction={directionFor("status")}
            onSort={() => toggle("status")}
          />
          <SortableTh
            label="Date"
            active={directionFor("created_at") !== null}
            direction={directionFor("created_at")}
            onSort={() => toggle("created_at")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={7} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={7}>
              {data && data.results.length === 0
                ? "No payments yet."
                : "No payments match your search or filter."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((payment) => (
              <Tr
                key={payment.id}
                onClick={() => router.push(`/admin/payments/${payment.id}`)}
              >
                <Td className="font-medium">#{payment.id}</Td>
                <Td className="text-ink-muted">
                  {payment.order !== null
                    ? `#${payment.order}`
                    : `Sub #${payment.subscription}`}
                </Td>
                <Td>
                  {customerFullName(payment.customer) ?? (
                    <span className="text-ink-muted">—</span>
                  )}
                </Td>
                <Td>
                  {customerNumber(payment.customer) ?? (
                    <span className="text-ink-muted">—</span>
                  )}
                </Td>

                <Td className="text-ink-muted">
                  <span className="flex items-center gap-2"><PaymentMethodIcon method={payment.payment_method_type} className="h-8 w-10" />{METHOD_LABELS[payment.payment_method_type]}</span>
                  {payment.reference && (
                    <span className="block text-xs">{payment.reference}</span>
                  )}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(payment.amount)}
                </Td>
                <Td>
                  <StatusBadge
                    label={payment.status}
                    tone={paymentStatusTone(payment.status)}
                  />
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(payment.received_at).toLocaleDateString()}
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
