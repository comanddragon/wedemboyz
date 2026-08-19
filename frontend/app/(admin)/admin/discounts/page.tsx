"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Tag } from "lucide-react";
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
import { DiscountCampaignForm } from "@/components/discounts/DiscountCampaignForm";
import { Button, Select, StatusBadge, type StatusTone } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { DiscountCampaign, DiscountCampaignSegment } from "@/types";

const SEGMENT_LABELS: Record<DiscountCampaignSegment, string> = {
  ALL: "All customers",
  NEW_CUSTOMERS: "New customers",
  LAPSED: "Lapsed customers",
  LOYALTY_GOLD: "Gold-tier loyalty",
};

const SEGMENT_FILTER_OPTIONS: { value: DiscountCampaignSegment | "ALL_SEGMENTS"; label: string }[] = [
  { value: "ALL_SEGMENTS", label: "All segments" },
  ...(Object.entries(SEGMENT_LABELS) as [DiscountCampaignSegment, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

const ACTIVE_FILTER_OPTIONS: { value: "ALL" | "ACTIVE" | "PAUSED"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

/** Derives a display status from is_active plus the date range, since a
 * campaign can be flagged active but not yet started, or active but expired. */
function campaignStatus(campaign: DiscountCampaign): { label: string; tone: StatusTone } {
  if (!campaign.is_active) return { label: "Paused", tone: "cancelled" };
  const today = new Date().toISOString().slice(0, 10);
  if (today < campaign.start_date) return { label: "Scheduled", tone: "pending" };
  if (today > campaign.end_date) return { label: "Ended", tone: "cancelled" };
  return { label: "Active", tone: "ready" };
}

function formatDiscountValue(campaign: DiscountCampaign): string {
  return campaign.discount_type === "PERCENTAGE" ? `${Number(campaign.value)}%` : `${Number(campaign.value)} XAF`;
}

type SortKey = "name" | "discount" | "target_segment" | "start_date" | "end_date";

export default function AdminDiscountsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<DiscountCampaignSegment | "ALL_SEGMENTS">("ALL_SEGMENTS");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // The backend view only paginates — it doesn't accept segment/active/search
  // query params — so those filters apply client-side over this page's rows,
  // same as the orders and inventory pages do for their page-local search.
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.campaigns.list(page),
    queryFn: () => discountsApi.listDiscountCampaigns({ page }),
  });

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    return data.results.filter((c) => {
      const matchesSearch = term === "" || c.name.toLowerCase().includes(term);
      const matchesSegment = segmentFilter === "ALL_SEGMENTS" || c.target_segment === segmentFilter;
      const matchesActive =
        activeFilter === "ALL" || c.is_active === (activeFilter === "ACTIVE");
      return matchesSearch && matchesSegment && matchesActive;
    });
  }, [data, search, segmentFilter, activeFilter]);

  const { sorted, toggle, directionFor } = useSort<DiscountCampaign, SortKey>(filtered, (row, key) => {
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
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Discounts"
        description="Staff-managed promo campaigns. Customers redeem individual codes at checkout separately from this list."
        action={
          <Button variant="gold" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New campaign
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
          <DiscountCampaignForm onDone={() => setShowCreateForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by campaign name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search campaigns"
        />
        <Select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as DiscountCampaignSegment | "ALL_SEGMENTS")}
          className="sm:w-52"
          aria-label="Filter by target segment"
        >
          {SEGMENT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
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
          <SortableTh label="Name" active={directionFor("name") !== null} direction={directionFor("name")} onSort={() => toggle("name")} />
          <SortableTh
            label="Discount"
            active={directionFor("discount") !== null}
            direction={directionFor("discount")}
            onSort={() => toggle("discount")}
          />
          <SortableTh
            label="Segment"
            active={directionFor("target_segment") !== null}
            direction={directionFor("target_segment")}
            onSort={() => toggle("target_segment")}
          />
          <Th>Status</Th>
          <SortableTh
            label="Starts"
            active={directionFor("start_date") !== null}
            direction={directionFor("start_date")}
            onSort={() => toggle("start_date")}
          />
          <SortableTh
            label="Ends"
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
                ? "No campaigns yet. Create one to get started."
                : "No campaigns match your search or filters."}
            </TableEmptyRow>
          )}

          {!isLoading &&
            sorted?.map((campaign) => {
              const status = campaignStatus(campaign);
              return (
                <Tr key={campaign.id} onClick={() => router.push(`/admin/discounts/${campaign.id}`)}>
                  <Td className="flex items-center gap-2 font-medium">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    {campaign.name}
                  </Td>
                  <Td className="tabular-nums">{formatDiscountValue(campaign)}</Td>
                  <Td className="text-ink-muted">{SEGMENT_LABELS[campaign.target_segment]}</Td>
                  <Td>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(campaign.start_date).toLocaleDateString()}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {new Date(campaign.end_date).toLocaleDateString()}
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
