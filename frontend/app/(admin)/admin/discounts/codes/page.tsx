"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Ticket } from "lucide-react";
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
import { PromoCodeForm } from "@/components/discounts/PromoCodeForm";
import { Button, Select, StatusBadge, type StatusTone } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { PromoCode } from "@/types";

const ACTIVE_FILTER_OPTIONS: { value: "ALL" | "ACTIVE" | "PAUSED"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

/** Derives a display status from is_active, the validity window, and usage,
 * since is_active alone doesn't tell the whole story (a code can be flagged
 * active but expired, or active but used up). */
function promoCodeStatus(promo: PromoCode): { label: string; tone: StatusTone } {
  if (!promo.is_active) return { label: "Paused", tone: "cancelled" };
  if (promo.max_uses != null && promo.times_used >= promo.max_uses) {
    return { label: "Exhausted", tone: "cancelled" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (today < promo.valid_from) return { label: "Scheduled", tone: "pending" };
  if (today > promo.valid_until) return { label: "Expired", tone: "cancelled" };
  return { label: "Active", tone: "ready" };
}

function formatDiscountValue(promo: PromoCode): string {
  return promo.discount_type === "PERCENTAGE" ? `${Number(promo.value)}%` : `${Number(promo.value)} XAF`;
}

type SortKey = "code" | "discount" | "times_used" | "valid_until";

export default function AdminPromoCodesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Same as campaigns — the backend only paginates this list, so search and
  // status filtering happen client-side over the current page.
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.promoCodes.list(page),
    queryFn: () => discountsApi.listPromoCodes({ page }),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((p) => {
      const matchesSearch = term === "" || p.code.toLowerCase().includes(term);
      const matchesActive = activeFilter === "ALL" || p.is_active === (activeFilter === "ACTIVE");
      return matchesSearch && matchesActive;
    });
  }, [data, search, activeFilter]);

  const { sorted, toggle, directionFor } = useSort<PromoCode, SortKey>(filtered, (row, key) => {
    switch (key) {
      case "code":
        return row.code.toLowerCase();
      case "discount":
        return Number(row.value);
      case "times_used":
        return row.times_used;
      case "valid_until":
        return row.valid_until;
    }
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Discounts"
        description="Promo codes customers redeem themselves at checkout."
        action={
          <Button variant="gold" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New code
          </Button>
        }
      />

      <Tabs
        items={[
          { href: "/admin/discounts", label: "Campaigns" },
          { href: "/admin/discounts/codes", label: "Promo codes" },
        ]}
      />

      {showCreateForm && (
        <div className="mb-6">
          <PromoCodeForm onDone={() => setShowCreateForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search promo codes"
        />
        <Select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as "ALL" | "ACTIVE" | "PAUSED")}
          className="sm:w-40"
          aria-label="Filter by status"
        >
          {ACTIVE_FILTER_OPTIONS.map((opt) => (
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
          <SortableTh label="Code" active={directionFor("code") !== null} direction={directionFor("code")} onSort={() => toggle("code")} />
          <SortableTh
            label="Discount"
            active={directionFor("discount") !== null}
            direction={directionFor("discount")}
            onSort={() => toggle("discount")}
          />
          <Th>Min. order</Th>
          <SortableTh
            label="Uses"
            align="right"
            active={directionFor("times_used") !== null}
            direction={directionFor("times_used")}
            onSort={() => toggle("times_used")}
          />
          <Th>Status</Th>
          <SortableTh
            label="Expires"
            active={directionFor("valid_until") !== null}
            direction={directionFor("valid_until")}
            onSort={() => toggle("valid_until")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={7} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={7}>
              {data && data.results.length === 0
                ? "No promo codes yet. Create one to get started."
                : "No codes match your search or filters."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((promo) => {
              const status = promoCodeStatus(promo);
              return (
                <Tr key={promo.id} onClick={() => router.push(`/admin/discounts/codes/${promo.id}`)}>
                  <Td className="flex items-center gap-2 font-medium">
                    <Ticket className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    {promo.code}
                  </Td>
                  <Td className="tabular-nums">{formatDiscountValue(promo)}</Td>
                  <Td className="text-ink-muted tabular-nums">{Number(promo.min_order_amount)} XAF</Td>
                  <Td align="right" className="tabular-nums">
                    {promo.times_used}
                    {promo.max_uses != null && <span className="text-ink-muted"> / {promo.max_uses}</span>}
                  </Td>
                  <Td>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(promo.valid_until).toLocaleDateString()}
                  </Td>
                  <Td>
                    <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                  </Td>
                </Tr>
              );
            })}
        </TBody>
      </TableContainer>

      {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
    </main>
  );
}
