"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
import { useSort } from "@/components/admin/useSort";
import { InventoryItemForm } from "@/components/inventory/InventoryItemForm";
import { Button, Card, Select, StatusBadge } from "@/components/ui";
import { inventoryApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryCategory, InventoryItem } from "@/types";

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  DETERGENT: "Detergent",
  SOFTENER: "Softener",
  PACKAGING: "Packaging",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

const CATEGORY_FILTER_OPTIONS: { value: InventoryCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All categories" },
  ...(Object.entries(CATEGORY_LABELS) as [InventoryCategory, string][]).map(([value, label]) => ({ value, label })),
];

type SortKey = "name" | "category" | "quantity" | "updated_at";

export default function AdminInventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "ALL">("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  const listParams = { category: categoryFilter === "ALL" ? undefined : categoryFilter };
  const { data: items, isLoading, error } = useQuery({
    queryKey: queryKeys.inventory.items.list(listParams),
    queryFn: () => inventoryApi.listInventoryItems(listParams),
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: queryKeys.inventory.items.lowStock,
    queryFn: () => inventoryApi.listLowStockItems(),
  });

  const filtered = useMemo(() => {
    if (!items) return undefined;
    const term = search.trim().toLowerCase();
    if (term === "") return items.results;
    return items.results.filter((i) => i.name.toLowerCase().includes(term));
  }, [items, search]);

  const { sorted, toggle, directionFor } = useSort<InventoryItem, SortKey>(filtered, (row, key) => {
    switch (key) {
      case "name":
        return row.name.toLowerCase();
      case "category":
        return row.category;
      case "quantity":
        return Number(row.quantity);
      case "updated_at":
        return row.updated_at;
    }
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <AdminPageHeader
        title="Inventory"
        description="Stock levels for supplies and equipment."
        action={
          <Button variant="gold" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add item
          </Button>
        }
      />

      {!lowStockLoading && lowStock && lowStock.results.length > 0 && (
        <Card className="mb-6 border-status-cancelled-text/30 bg-status-cancelled-bg">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-status-cancelled-text">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-status-cancelled-text">
                {lowStock.results.length} item{lowStock.results.length === 1 ? "" : "s"} low on stock
              </p>
              <p className="mt-1 text-xs text-status-cancelled-text/80">
                {lowStock.results.map((i) => i.name).join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {showAddForm && (
        <div className="mb-6">
          <InventoryItemForm onDone={() => setShowAddForm(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Search inventory items"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as InventoryCategory | "ALL")}
          className="sm:w-48"
          aria-label="Filter by category"
        >
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {items && (
          <p className="text-xs text-ink-muted sm:ml-auto">
            {filtered?.length ?? 0} of {items.results.length} items
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}

      <TableContainer>
        <THead>
          <SortableTh label="Name" active={directionFor("name") !== null} direction={directionFor("name")} onSort={() => toggle("name")} />
          <SortableTh
            label="Category"
            active={directionFor("category") !== null}
            direction={directionFor("category")}
            onSort={() => toggle("category")}
          />
          <SortableTh
            label="Quantity"
            align="right"
            active={directionFor("quantity") !== null}
            direction={directionFor("quantity")}
            onSort={() => toggle("quantity")}
          />
          <Th>Status</Th>
          <SortableTh
            label="Updated"
            active={directionFor("updated_at") !== null}
            direction={directionFor("updated_at")}
            onSort={() => toggle("updated_at")}
          />
          <Th className="w-8" />
        </THead>
        <TBody>
          {isLoading && <TableSkeleton columns={6} />}
          {!isLoading && sorted && sorted.length === 0 && (
            <TableEmptyRow colSpan={6}>
              {items && items.results.length === 0 ? "No inventory items yet." : "No items match your search or filter."}
            </TableEmptyRow>
          )}
          {!isLoading &&
            sorted?.map((item) => (
              <Tr key={item.id} onClick={() => router.push(`/admin/inventory/${item.id}`)}>
                <Td className="flex items-center gap-2 font-medium">
                  <Package className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  {item.name}
                </Td>
                <Td className="text-ink-muted">{CATEGORY_LABELS[item.category]}</Td>
                <Td align="right" className="tabular-nums">
                  {item.quantity} {item.unit}
                </Td>
                <Td>
                  {item.is_low_stock ? (
                    <StatusBadge label="Low stock" tone="cancelled" />
                  ) : (
                    <StatusBadge label="OK" tone="ready" />
                  )}
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">{new Date(item.updated_at).toLocaleDateString()}</Td>
                <Td>
                  <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </Td>
              </Tr>
            ))}
        </TBody>
      </TableContainer>
    </main>
  );
}
