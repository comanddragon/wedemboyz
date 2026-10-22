"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import { SearchInput } from "@/src/components/admin/SearchInput";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
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
import { Select, StatusBadge } from "@/src/components/ui";
import { customersApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { ListCustomersParams } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

type SortKey = "first_name" | "orders_count" | "lifetime_spend" | "created_at";

const SORT_TO_ORDERING: Record<
  SortKey,
  {
    asc: ListCustomersParams["ordering"];
    desc: ListCustomersParams["ordering"];
  }
> = {
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
  const { locale, t } = useI18n();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [tier, setTier] = useState<"" | "BRONZE" | "SILVER" | "GOLD">("");
  const [hasCredit, setHasCredit] = useState<"" | "true" | "false">("");
  const [source, setSource] = useState<"" | "ONLINE" | "WALK_IN" | "REFERRAL" | "OTHER">("");

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
  const params: ListCustomersParams = {
    page,
    search: search || undefined,
    ordering,
    tier: tier || undefined,
    has_credit: hasCredit ? hasCredit === "true" : undefined,
    source: source || undefined,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customersApi.listCustomers(params),
  });

  const directionFor = (key: SortKey) => (sortKey === key ? direction : null);

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminCustomers.title")}
        description={t("adminCustomers.body")}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder={t("adminCustomers.search")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search customers"
        />
        <Select value={tier} onChange={(event) => { setTier(event.target.value as typeof tier); setPage(1); }} className="sm:w-36" aria-label="Filter customers by tier"><option value="">{t("adminCustomers.allTiers")}</option><option value="BRONZE">Bronze</option><option value="SILVER">Silver</option><option value="GOLD">Gold</option></Select>
        <Select value={hasCredit} onChange={(event) => { setHasCredit(event.target.value as typeof hasCredit); setPage(1); }} className="sm:w-40" aria-label="Filter customers by balance"><option value="">{t("adminCustomers.anyBalance")}</option><option value="true">{t("adminCustomers.owes")}</option><option value="false">{t("adminCustomers.noBalance")}</option></Select>
        <Select value={source} onChange={(event) => { setSource(event.target.value as typeof source); setPage(1); }} className="sm:w-40" aria-label="Filter customers by source"><option value="">{t("adminCustomers.allSources")}</option><option value="ONLINE">{t("adminCustomers.online")}</option><option value="WALK_IN">{t("adminCustomers.walkIn")}</option><option value="REFERRAL">{t("adminCustomers.referral")}</option><option value="OTHER">{t("adminCustomers.other")}</option></Select>
        {data && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {data.results.length} {t("adminCustomers.of")} {data.count} {t("adminCustomers.total")}
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
            label={t("adminCustomers.customer")}
            active={directionFor("first_name") !== null}
            direction={directionFor("first_name")}
            onSort={() => toggleSort("first_name")}
          />
          <Th>{t("adminCustomers.phone")}</Th>
          <Th>{t("adminCustomers.city")}</Th>
          <SortableTh
            label={t("adminCustomers.orders")}
            align="right"
            active={directionFor("orders_count") !== null}
            direction={directionFor("orders_count")}
            onSort={() => toggleSort("orders_count")}
          />
          <SortableTh
            label={t("adminCustomers.spend")}
            align="right"
            active={directionFor("lifetime_spend") !== null}
            direction={directionFor("lifetime_spend")}
            onSort={() => toggleSort("lifetime_spend")}
          />
          <Th>{t("adminCustomers.tier")}</Th>
          <Th align="right">{t("adminCustomers.credit")}</Th>
          <SortableTh
            label={t("adminCustomers.joined")}
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
              {search ? t("adminCustomers.noMatch") : t("adminCustomers.empty")}
            </TableEmptyRow>
          )}

          {!isLoading &&
            data?.results.map((customer) => (
              <Tr
                key={customer.id}
                onClick={() => router.push(`/admin/customers/${customer.id}`)}
              >
                <Td className="font-medium">
                  <span className="flex items-center gap-2"><CustomerAvatar name={`${customer.first_name} ${customer.last_name}`.trim() || customer.phone_number} size="sm" imageUrl={customer.avatar} useProfilePhoto={customer.use_profile_photo} /><span>{`${customer.first_name} ${customer.last_name}`.trim() || "—"}</span></span>
                  {!customer.is_active && (
                    <span className="ml-2 rounded-full bg-status-cancelled-bg px-2 py-0.5 text-[11px] font-medium text-status-cancelled-text">
                      {t("adminCustomers.inactive")}
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
                    <StatusBadge
                      label={
                        TIER_LABEL[customer.loyalty_tier] ??
                        customer.loyalty_tier
                      }
                      tone="ready"
                    />
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
                  {new Date(customer.created_at).toLocaleDateString(locale)}
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

      {data &&
        data.results.length === 0 &&
        !isLoading &&
        data.count === 0 &&
        !search && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t("adminCustomers.emptyHelp")}
          </p>
        )}

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
