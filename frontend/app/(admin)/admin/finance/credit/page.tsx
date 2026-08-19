"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { SortableTh, TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { financeApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ListCreditAccountsParams } from "@/types";

type SortKey = "balance" | "updated_at";

const SORT_TO_ORDERING: Record<SortKey, { asc: ListCreditAccountsParams["ordering"]; desc: ListCreditAccountsParams["ordering"] }> = {
  balance: { asc: "balance", desc: "-balance" },
  updated_at: { asc: "updated_at", desc: "-updated_at" },
};

export default function AdminCreditAccountsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey | null>("balance");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  // Same debounce rationale as /admin/customers — this list is searched
  // server-side, so we don't want a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setDirection("asc");
    } else if (direction === "asc") {
      setDirection("desc");
    } else {
      setSortKey(null);
    }
  };

  const ordering = sortKey ? SORT_TO_ORDERING[sortKey][direction] : undefined;
  const params: ListCreditAccountsParams = {
    page,
    search: search || undefined,
    ordering,
    outstanding_only: outstandingOnly,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.finance.creditAccounts.list(params),
    queryFn: () => financeApi.listCreditAccounts(params),
  });

  const directionFor = (key: SortKey) => (sortKey === key ? direction : null);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Clients à crédit"
        description="Customers with a running tab — charge, track, and settle balances."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name or phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search credit accounts"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={outstandingOnly}
            onChange={(e) => {
              setOutstandingOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-crease text-navy focus:ring-navy"
          />
          Outstanding only
        </label>
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {data.results.length} of {data.count} total
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}

      <TableContainer>
        <THead>
          <Th>Customer</Th>
          <Th>Phone</Th>
          <SortableTh
            label="Balance owed"
            align="right"
            active={directionFor("balance") !== null}
            direction={directionFor("balance")}
            onSort={() => toggleSort("balance")}
          />
          <Th align="right">Credit limit</Th>
          <SortableTh
            label="Last activity"
            align="right"
            active={directionFor("updated_at") !== null}
            direction={directionFor("updated_at")}
            onSort={() => toggleSort("updated_at")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={6} />}

          {!isLoading && data && data.results.length === 0 && (
            <TableEmptyRow colSpan={6}>
              {search
                ? "No credit accounts match your search."
                : outstandingOnly
                  ? "No customers currently owe a balance."
                  : "No credit accounts yet."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            data?.results.map((account) => (
              <Tr key={account.id} onClick={() => router.push(`/admin/finance/credit/${account.user.id}`)}>
                <Td className="font-medium">
                  {`${account.user.first_name} ${account.user.last_name}`.trim() || `Customer #${account.user.id}`}
                </Td>
                <Td className="text-ink-muted">{account.user.phone_number}</Td>
                <Td align="right" className="tabular-nums">
                  {Number(account.balance) > 0 ? (
                    <span className="font-medium text-status-cancelled-text">{formatCurrency(account.balance)}</span>
                  ) : (
                    formatCurrency(account.balance)
                  )}
                </Td>
                <Td align="right" className="tabular-nums text-ink-muted">
                  {formatCurrency(account.credit_limit)}
                </Td>
                <Td align="right" className="whitespace-nowrap text-ink-muted">
                  {account.days_since_last_activity === null
                    ? "—"
                    : account.days_since_last_activity === 0
                      ? "Today"
                      : `${account.days_since_last_activity}d ago`}
                </Td>
                <Td>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {data && data.results.length === 0 && !isLoading && data.count === 0 && !search && outstandingOnly && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          Accounts show up here once a charge is recorded — from a customer&apos;s fiche or a pay-later quick sale.
        </p>
      )}

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
