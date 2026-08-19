"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import Link from "next/link";
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
import { Tabs } from "@/components/admin/Tabs";
import { useSort } from "@/components/admin/useSort";
import { Select, StatusBadge, refundStatusTone } from "@/components/ui";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { Refund, RefundStatus } from "@/types";

const STATUS_OPTIONS: { value: RefundStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PROCESSED", label: "Processed" },
  { value: "REJECTED", label: "Rejected" },
];

type SortKey = "id" | "payment" | "amount" | "status" | "created_at";

export default function AdminRefundsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "ALL">("ALL");

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.payments.refunds(page),
    queryFn: () => paymentsApi.listRefunds(page),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((r) => {
      const matchesSearch = term === "" || String(r.id).includes(term) || String(r.payment).includes(term);
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const { sorted, toggle, directionFor } = useSort<Refund, SortKey>(filtered, (row, key) => {
    switch (key) {
      case "id":
        return row.id;
      case "payment":
        return row.payment;
      case "amount":
        return Number(row.amount);
      case "status":
        return row.status;
      case "created_at":
        return row.created_at;
    }
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader title="Payments" description="Every payment attempt across all customers." />

      <Tabs
        items={[
          { href: "/admin/payments", label: "Payments" },
          { href: "/admin/payments/refunds", label: "Refunds" },
          { href: "/admin/payments/invoices", label: "Invoices" },
        ]}
      />

      <div className="mb-4 flex items-start gap-2 rounded-card bg-status-progress-bg px-3.5 py-2.5 text-xs text-status-progress-text">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <p>View-only for now — there&apos;s no confirmed approve/reject/process endpoint yet, so this table can&apos;t take action on a refund.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search this page by refund # or payment #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search refunds on this page"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RefundStatus | "ALL")}
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
          <SortableTh label="Refund" active={directionFor("id") !== null} direction={directionFor("id")} onSort={() => toggle("id")} />
          <SortableTh
            label="Payment"
            active={directionFor("payment") !== null}
            direction={directionFor("payment")}
            onSort={() => toggle("payment")}
          />
          <Th>Reason</Th>
          <SortableTh
            label="Amount"
            align="right"
            active={directionFor("amount") !== null}
            direction={directionFor("amount")}
            onSort={() => toggle("amount")}
          />
          <SortableTh label="Status" active={directionFor("status") !== null} direction={directionFor("status")} onSort={() => toggle("status")} />
          <SortableTh
            label="Requested"
            active={directionFor("created_at") !== null}
            direction={directionFor("created_at")}
            onSort={() => toggle("created_at")}
          />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={6} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={6}>
              {data && data.results.length === 0 ? "No refunds requested yet." : "No refunds match your search or filter."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((refund) => (
              <Tr key={refund.id}>
                <Td className="font-medium">#{refund.id}</Td>
                <Td>
                  <Link href={`/admin/payments/${refund.payment}`} className="text-navy hover:underline">
                    #{refund.payment}
                  </Link>
                </Td>
                <Td className="text-ink-muted">{refund.reason || "—"}</Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(refund.amount)}
                </Td>
                <Td>
                  <StatusBadge label={refund.status} tone={refundStatusTone(refund.status)} />
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">{new Date(refund.created_at).toLocaleDateString()}</Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
