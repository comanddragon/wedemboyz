"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { SortableTh, TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { StatusBadge } from "@/components/ui";
import { customersApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ListCustomersParams } from "@/types";

type SortKey = "first_name" | "orders_count" | "lifetime_spend" | "created_at";

const SORT_TO_ORDERING: Record<SortKey, { asc: ListCustomersParams["ordering"]; desc: ListCustomersParams["ordering"] }> = {
  first_name: { asc: "first_name", desc: "-first_name" },
  orders_count: { asc: "orders_count", desc: "-orders_count" },
  lifetime_spend: { asc: "lifetime_spend", desc: "-lifetime_spend" },
  created_at: { asc: "created_at", desc: "-created_at" },
};

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  // Debounce the search box before it hits the server — this list is
  // searched server-side (unlike /admin/orders, which filters page 1
  // client-side), so we don't want a request per keystroke.
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
  const params: ListCustomersParams = { page, search: search || undefined, ordering };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customersApi.listCustomers(params),
  });

  const directionFor = (key: SortKey) => (sortKey === key ? direction : null);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader title="Customers" description="A searchable directory of every customer." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name, phone, or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search customers"
        />
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {data.results.length} of {data.count} total
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}

      <TableContainer>
        <THead>
          <SortableTh
            label="Customer"
            active={directionFor("first_name") !== null}
            direction={directionFor("first_name")}
            onSort={() => toggleSort("first_name")}
          />
          <Th>Phone</Th>
          <Th>City</Th>
          <SortableTh
            label="Orders"
            align="right"
            active={directionFor("orders_count") !== null}
            direction={directionFor("orders_count")}
            onSort={() => toggleSort("orders_count")}
          />
          <SortableTh
            label="Lifetime spend"
            align="right"
            active={directionFor("lifetime_spend") !== null}
            direction={directionFor("lifetime_spend")}
            onSort={() => toggleSort("lifetime_spend")}
          />
          <Th>Loyalty tier</Th>
          <Th align="right">Credit owed</Th>
          <SortableTh
            label="Joined"
            active={directionFor("created_at") !== null}
            direction={directionFor("created_at")}
            onSort={() => toggleSort("created_at")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={9} />}

          {!isLoading && data && data.results.length === 0 && (
            <TableEmptyRow colSpan={9}>
              {search ? "No customers match your search." : "No customers yet."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            data?.results.map((customer) => (
              <Tr key={customer.id} onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                <Td className="font-medium">
                  {`${customer.first_name} ${customer.last_name}`.trim() || "—"}
                  {!customer.is_active && (
                    <span className="ml-2 rounded-full bg-status-cancelled-bg px-2 py-0.5 text-[11px] font-medium text-status-cancelled-text">
                      inactive
                    </span>
                  )}
                </Td>
                <Td className="text-ink-muted">{customer.phone_number}</Td>
                <Td className="text-ink-muted">{customer.city || "—"}</Td>
                <Td align="right" className="tabular-nums">
                  {customer.orders_count}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(customer.lifetime_spend)}
                </Td>
                <Td>
                  {customer.loyalty_tier ? (
                    <StatusBadge label={TIER_LABEL[customer.loyalty_tier] ?? customer.loyalty_tier} tone="ready" />
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </Td>
                <Td align="right" className="tabular-nums">
                  {Number(customer.credit_balance) > 0 ? (
                    <span className="font-medium text-status-cancelled-text">
                      {formatCurrency(customer.credit_balance)}
                    </span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(customer.created_at).toLocaleDateString()}
                </Td>
                <Td>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>

      {data && data.results.length === 0 && !isLoading && data.count === 0 && !search && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Customers show up here as soon as someone registers or a walk-in sale is recorded for them.
        </p>
      )}

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
