"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Ticket } from "lucide-react";
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
import { useSort } from "@/src/components/admin/useSort";
import { PromoCodeForm } from "@/src/components/discounts/PromoCodeForm";
import {
  Button,
  Select,
  StatusBadge,
  type StatusTone,
} from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { PromoCode } from "@/src/types";

function formatDiscountValue(promo: PromoCode): string {
  return promo.discount_type === "PERCENTAGE"
    ? `${Number(promo.value)}%`
    : formatCurrency(promo.value);
}

type SortKey = "code" | "discount" | "times_used" | "valid_until";

export default function AdminPromoCodesPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">(
    "ALL",
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  const activeFilterOptions: {
    value: "ALL" | "ACTIVE" | "PAUSED";
    label: string;
  }[] = [
    { value: "ALL", label: t("adminDiscounts.allStatuses") },
    { value: "ACTIVE", label: t("adminDiscounts.activeStatus") },
    { value: "PAUSED", label: t("adminDiscounts.pausedStatus") },
  ];

  function getPromoCodeStatus(promo: PromoCode): {
    label: string;
    tone: StatusTone;
  } {
    if (!promo.is_active)
      return { label: t("adminDiscounts.pausedStatus"), tone: "cancelled" };
    if (promo.max_uses != null && promo.times_used >= promo.max_uses) {
      return { label: t("adminDiscounts.exhaustedStatus"), tone: "cancelled" };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (today < promo.valid_from)
      return { label: t("adminDiscounts.scheduledStatus"), tone: "pending" };
    if (today > promo.valid_until)
      return { label: t("adminDiscounts.expiredStatus"), tone: "cancelled" };
    return { label: t("adminDiscounts.activeStatus"), tone: "ready" };
  }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.promoCodes.list(page),
    queryFn: () => discountsApi.listPromoCodes({ page }),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((p) => {
      const matchesSearch = term === "" || p.code.toLowerCase().includes(term);
      const matchesActive =
        activeFilter === "ALL" || p.is_active === (activeFilter === "ACTIVE");
      return matchesSearch && matchesActive;
    });
  }, [data, search, activeFilter]);

  const { sorted, toggle, directionFor } = useSort<PromoCode, SortKey>(
    filtered,
    (row, key) => {
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
    },
  );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminDiscounts.title")}
        description={t("adminDiscounts.codesSubtitle")}
        action={
          <Button variant="gold" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("adminDiscounts.newCode")}
          </Button>
        }
      />

      <Tabs
        items={[
          { href: "/admin/discounts", label: t("adminDiscounts.campaignsTab") },
          { href: "/admin/discounts/codes", label: t("adminDiscounts.codesTab") },
        ]}
      />

      {showCreateForm && (
        <div className="mb-6">
          <PromoCodeForm onDone={() => setShowCreateForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder={t("adminDiscounts.searchCodesPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label={t("adminDiscounts.searchCodesPlaceholder")}
        />
        <Select
          value={activeFilter}
          onChange={(e) =>
            setActiveFilter(e.target.value as "ALL" | "ACTIVE" | "PAUSED")
          }
          className="sm:w-40"
          aria-label={t("adminDiscounts.colStatus")}
        >
          {activeFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {t("adminDiscounts.pageCount")
              .replace("{filtered}", String(filtered?.length ?? 0))
              .replace("{total}", String(data.results.length))
              .replace("{overall}", String(data.count))}
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
            label={t("adminDiscounts.colCode")}
            active={directionFor("code") !== null}
            direction={directionFor("code")}
            onSort={() => toggle("code")}
          />
          <SortableTh
            label={t("adminDiscounts.colDiscount")}
            active={directionFor("discount") !== null}
            direction={directionFor("discount")}
            onSort={() => toggle("discount")}
          />
          <Th>{t("adminDiscounts.colMinOrder")}</Th>
          <SortableTh
            label={t("adminDiscounts.colUses")}
            align="right"
            active={directionFor("times_used") !== null}
            direction={directionFor("times_used")}
            onSort={() => toggle("times_used")}
          />
          <Th>{t("adminDiscounts.colStatus")}</Th>
          <SortableTh
            label={t("adminDiscounts.colExpires")}
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
                ? t("adminDiscounts.noCodesYet")
                : t("adminDiscounts.noCodesMatch")}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((promo) => {
              const status = getPromoCodeStatus(promo);
              return (
                <Tr
                  key={promo.id}
                  onClick={() =>
                    router.push(`/admin/discounts/codes/${promo.id}`)
                  }
                >
                  <Td className="flex items-center gap-2 font-medium">
                    <Ticket
                      className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                      aria-hidden="true"
                    />
                    {promo.code}
                  </Td>
                  <Td className="tabular-nums">{formatDiscountValue(promo)}</Td>
                  <Td className="text-ink-muted tabular-nums">
                    {formatCurrency(promo.min_order_amount)}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {promo.times_used}
                    {promo.max_uses != null && (
                      <span className="text-ink-muted">
                        {" "}
                        / {promo.max_uses}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(promo.valid_until).toLocaleDateString(
                      locale === "fr" ? "fr-FR" : "en-US",
                    )}
                  </Td>
                  <Td>
                    <ChevronRight
                      className="h-4 w-4 text-ink-muted"
                      aria-hidden="true"
                    />
                  </Td>
                </Tr>
              );
            })}
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
