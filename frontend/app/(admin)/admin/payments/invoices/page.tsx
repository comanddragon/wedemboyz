"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
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
import { Tabs } from "@/components/admin/Tabs";
import { useSort } from "@/components/admin/useSort";
import { StatusBadge } from "@/components/ui";
import { paymentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { Invoice } from "@/types";

type SortKey = "id" | "order" | "amount_due" | "is_settled" | "issued_at";

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.payments.invoices(page),
    queryFn: () => paymentsApi.listInvoices(page),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    if (term === "") return data.results;
    return data.results.filter(
      (inv) =>
        String(inv.id).includes(term) ||
        String(inv.order).includes(term) ||
        inv.invoice_number.toLowerCase().includes(term),
    );
  }, [data, search]);

  const { sorted, toggle, directionFor } = useSort<Invoice, SortKey>(filtered, (row, key) => {
    switch (key) {
      case "id":
        return row.id;
      case "order":
        return row.order;
      case "amount_due":
        return Number(row.amount_due);
      case "is_settled":
        return row.is_settled ? 1 : 0;
      case "issued_at":
        return row.issued_at;
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search this page by invoice #, number, or order #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
          aria-label="Search invoices on this page"
        />
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {filtered?.length ?? 0} of {data.results.length} on this page · {data.count} total
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}

      <TableContainer>
        <THead>
          <SortableTh label="Invoice" active={directionFor("id") !== null} direction={directionFor("id")} onSort={() => toggle("id")} />
          <SortableTh label="Order" active={directionFor("order") !== null} direction={directionFor("order")} onSort={() => toggle("order")} />
          <SortableTh
            label="Amount due"
            align="right"
            active={directionFor("amount_due") !== null}
            direction={directionFor("amount_due")}
            onSort={() => toggle("amount_due")}
          />
          <Th align="right">Paid</Th>
          <SortableTh
            label="Settled"
            active={directionFor("is_settled") !== null}
            direction={directionFor("is_settled")}
            onSort={() => toggle("is_settled")}
          />
          <SortableTh
            label="Issued"
            active={directionFor("issued_at") !== null}
            direction={directionFor("issued_at")}
            onSort={() => toggle("issued_at")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={7} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={7}>
              {data && data.results.length === 0 ? "No invoices yet." : "No invoices match your search."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((invoice) => (
              <Tr key={invoice.id} onClick={() => router.push(`/admin/payments/invoices/${invoice.id}`)}>
                <Td className="font-medium">{invoice.invoice_number || `#${invoice.id}`}</Td>
                <Td className="text-ink-muted">#{invoice.order}</Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(invoice.amount_due)}
                </Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatCurrency(invoice.amount_paid)}
                </Td>
                <Td>
                  <StatusBadge
                    label={invoice.is_settled ? "Settled" : "Outstanding"}
                    tone={invoice.is_settled ? "ready" : "pending"}
                  />
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">{new Date(invoice.issued_at).toLocaleDateString()}</Td>
                <Td>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
