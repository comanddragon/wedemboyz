"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Tag } from "lucide-react";
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
import { DiscountCampaignForm } from "@/src/components/discounts/DiscountCampaignForm";
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
import type { DiscountCampaign, DiscountCampaignSegment } from "@/src/types";

function formatDiscountValue(campaign: DiscountCampaign): string {
  return campaign.discount_type === "PERCENTAGE"
    ? `${Number(campaign.value)}%`
    : formatCurrency(campaign.value);
}

type SortKey =
  "name" | "discount" | "target_segment" | "start_date" | "end_date";

export default function AdminDiscountsPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<
    DiscountCampaignSegment | "ALL_SEGMENTS"
  >("ALL_SEGMENTS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">(
    "ALL",
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  const segmentLabels: Record<DiscountCampaignSegment, string> = {
    ALL: t("adminDiscounts.segments.ALL"),
    NEW_CUSTOMERS: t("adminDiscounts.segments.NEW_CUSTOMERS"),
    LAPSED: t("adminDiscounts.segments.LAPSED"),
    LOYALTY_GOLD: t("adminDiscounts.segments.LOYALTY_GOLD"),
  };

  const segmentFilterOptions: {
    value: DiscountCampaignSegment | "ALL_SEGMENTS";
    label: string;
  }[] = [
    { value: "ALL_SEGMENTS", label: t("adminDiscounts.allSegments") },
    ...(
      Object.entries(segmentLabels) as [DiscountCampaignSegment, string][]
    ).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  const activeFilterOptions: {
    value: "ALL" | "ACTIVE" | "PAUSED";
    label: string;
  }[] = [
    { value: "ALL", label: t("adminDiscounts.allStatuses") },
    { value: "ACTIVE", label: t("adminDiscounts.activeStatus") },
    { value: "PAUSED", label: t("adminDiscounts.pausedStatus") },
  ];

  function getCampaignStatus(campaign: DiscountCampaign): {
    label: string;
    tone: StatusTone;
  } {
    if (!campaign.is_active)
      return { label: t("adminDiscounts.pausedStatus"), tone: "cancelled" };
    const today = new Date().toISOString().slice(0, 10);
    if (today < campaign.start_date)
      return { label: t("adminDiscounts.scheduledStatus"), tone: "pending" };
    if (today > campaign.end_date)
      return { label: t("adminDiscounts.endedStatus"), tone: "cancelled" };
    return { label: t("adminDiscounts.activeStatus"), tone: "ready" };
  }

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.campaigns.list(page),
    queryFn: () => discountsApi.listDiscountCampaigns({ page }),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((c) => {
      const matchesSearch = term === "" || c.name.toLowerCase().includes(term);
      const matchesSegment =
        segmentFilter === "ALL_SEGMENTS" || c.target_segment === segmentFilter;
      const matchesActive =
        activeFilter === "ALL" || c.is_active === (activeFilter === "ACTIVE");
      return matchesSearch && matchesSegment && matchesActive;
    });
  }, [data, search, segmentFilter, activeFilter]);

  const { sorted, toggle, directionFor } = useSort<DiscountCampaign, SortKey>(
    filtered,
    (row, key) => {
      switch (key) {
        case "name":
          return row.name.toLowerCase();
        case "discount":
          return Number(row.value);
        case "target_segment":
          return row.target_segment;
        case "start_date":
          return row.start_date;
        case "end_date":
          return row.end_date;
      }
    },
  );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminDiscounts.title")}
        description={t("adminDiscounts.campaignsSubtitle")}
        action={
          <Button variant="gold" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("adminDiscounts.newCampaign")}
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
          <DiscountCampaignForm onDone={() => setShowCreateForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder={t("adminDiscounts.searchCampaignsPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label={t("adminDiscounts.searchCampaignsPlaceholder")}
        />
        <Select
          value={segmentFilter}
          onChange={(e) =>
            setSegmentFilter(
              e.target.value as DiscountCampaignSegment | "ALL_SEGMENTS",
            )
          }
          className="sm:w-52"
          aria-label={t("adminDiscounts.colSegment")}
        >
          {segmentFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
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
            label={t("adminDiscounts.colName")}
            active={directionFor("name") !== null}
            direction={directionFor("name")}
            onSort={() => toggle("name")}
          />
          <SortableTh
            label={t("adminDiscounts.colDiscount")}
            active={directionFor("discount") !== null}
            direction={directionFor("discount")}
            onSort={() => toggle("discount")}
          />
          <SortableTh
            label={t("adminDiscounts.colSegment")}
            active={directionFor("target_segment") !== null}
            direction={directionFor("target_segment")}
            onSort={() => toggle("target_segment")}
          />
          <Th>{t("adminDiscounts.colStatus")}</Th>
          <SortableTh
            label={t("adminDiscounts.colStarts")}
            active={directionFor("start_date") !== null}
            direction={directionFor("start_date")}
            onSort={() => toggle("start_date")}
          />
          <SortableTh
            label={t("adminDiscounts.colEnds")}
            active={directionFor("end_date") !== null}
            direction={directionFor("end_date")}
            onSort={() => toggle("end_date")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={7} />}

          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={7}>
              {data && data.results.length === 0
                ? t("adminDiscounts.noCampaignsYet")
                : t("adminDiscounts.noCampaignsMatch")}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((campaign) => {
              const status = getCampaignStatus(campaign);
              return (
                <Tr
                  key={campaign.id}
                  onClick={() => router.push(`/admin/discounts/${campaign.id}`)}
                >
                  <Td className="flex items-center gap-2 font-medium">
                    <Tag
                      className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                      aria-hidden="true"
                    />
                    {campaign.name}
                  </Td>
                  <Td className="tabular-nums">
                    {formatDiscountValue(campaign)}
                  </Td>
                  <Td className="text-ink-muted">
                    {segmentLabels[campaign.target_segment]}
                  </Td>
                  <Td>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(campaign.start_date).toLocaleDateString(
                      locale === "fr" ? "fr-FR" : "en-US",
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(campaign.end_date).toLocaleDateString(
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
