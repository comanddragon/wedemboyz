"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { InventoryAdjustForm } from "@/src/components/inventory/InventoryAdjustForm";
import { InventoryItemForm } from "@/src/components/inventory/InventoryItemForm";
import { Button, Card, StatusBadge } from "@/src/components/ui";
import { inventoryApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { InventoryCategory, InventoryChangeType } from "@/src/types";

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  DETERGENT: "Detergent",
  SOFTENER: "Softener",
  PACKAGING: "Packaging",
  EQUIPMENT: "Equipment",
  STAIN_REMOVER: "Stain remover",
  BLEACH: "Bleach",
  HANGERS: "Hangers",
  BAGS: "Bags",
  MACHINE_PARTS: "Machine parts",
  CLEANING: "Cleaning supplies",
  OTHER: "Other",
};

const CHANGE_TYPE_LABELS: Record<InventoryChangeType, string> = {
  RESTOCK: "Restock",
  USAGE: "Usage",
  ADJUSTMENT: "Correction",
  WASTE: "Waste",
  DAMAGED: "Damaged",
  RETURN_TO_SUPPLIER: "Supplier return",
  TRANSFER: "Transfer",
  OPENING_STOCK: "Opening stock",
};

export default function AdminInventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const itemId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    data: item,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.inventory.items.detail(itemId),
    queryFn: () => inventoryApi.getInventoryItem(itemId),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: queryKeys.inventory.items.transactions(itemId),
    queryFn: () => inventoryApi.listInventoryItemTransactions(itemId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => inventoryApi.deleteInventoryItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      router.push("/admin/inventory");
    },
    onError: (err) => setDeleteError(getApiErrorMessage(err)),
  });

  function handleDelete() {
    if (window.confirm(`Archive "${item?.name}"? Its transaction history will remain available.`)) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        Loading...
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href="/admin/inventory"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to inventory
        </Link>
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/inventory"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to inventory
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {item.name}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {CATEGORY_LABELS[item.category]}
          </p>
        </div>
        {item.is_low_stock ? (
          <StatusBadge label="Low stock" tone="cancelled" />
        ) : (
          <StatusBadge label="OK" tone="ready" />
        )}
      </div>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-navy">
              {item.quantity}{" "}
              <span className="text-sm font-normal text-ink-muted">
                {item.unit}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Low-stock threshold: {item.low_stock_threshold} {item.unit}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowAdjustForm((v) => !v)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adjust stock
          </Button>
        </div>
        {item.notes && (
          <p className="mt-3 border-t border-crease pt-3 text-sm text-ink-muted">
            {item.notes}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-crease pt-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted">Average cost</dt>
            <dd className="mt-1 font-semibold tabular-nums text-ink">{formatCurrency(item.average_cost)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Stock value</dt>
            <dd className="mt-1 font-semibold tabular-nums text-ink">{formatCurrency(item.stock_value)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Supplier</dt>
            <dd className="mt-1 font-medium text-ink">{item.supplier_detail?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Location</dt>
            <dd className="mt-1 font-medium text-ink">{item.storage_location || "—"}</dd>
          </div>
        </dl>
      </Card>

      {showAdjustForm && (
        <div className="mb-3">
          <InventoryAdjustForm
            item={item}
            onDone={() => setShowAdjustForm(false)}
          />
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowEditForm((v) => !v)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {showEditForm ? "Close" : "Edit details"}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {deleteMutation.isPending ? "Archiving…" : "Archive item"}
        </Button>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-status-cancelled-text">{deleteError}</p>
      )}

      {showEditForm && (
        <div className="mb-6">
          <InventoryItemForm
            item={item}
            onDone={() => setShowEditForm(false)}
          />
        </div>
      )}

      <h2 className="font-display mb-3 text-sm font-medium text-ink">
        Transaction history
      </h2>
      <TableContainer>
        <THead>
          <Th>Type</Th>
          <Th align="right">Change</Th>
          <Th>Reason</Th>
          <Th>By</Th>
          <Th align="right">When</Th>
        </THead>
        <TBody>
          {transactionsLoading && <TableSkeleton columns={5} />}
          {!transactionsLoading &&
            transactions &&
            transactions.results.length === 0 && (
              <TableEmptyRow colSpan={5}>
                No stock changes recorded yet.
              </TableEmptyRow>
            )}
          {!transactionsLoading &&
            transactions?.results.map((tx) => {
              const change = Number(tx.quantity_change);
              return (
                <Tr key={tx.id}>
                  <Td>{CHANGE_TYPE_LABELS[tx.change_type]}</Td>
                  <Td
                    align="right"
                    className={`tabular-nums ${change >= 0 ? "text-status-ready-text" : "text-status-cancelled-text"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {tx.quantity_change} {item.unit}
                  </Td>
                  <Td className="text-ink-muted">
                    {tx.reason || <span>—</span>}
                  </Td>
                  <Td className="text-ink-muted">
                    {tx.created_by?.name || <span>—</span>}
                  </Td>
                  <Td
                    align="right"
                    className="whitespace-nowrap text-ink-muted"
                  >
                    {new Date(tx.created_at).toLocaleString()}
                  </Td>
                </Tr>
              );
            })}
        </TBody>
      </TableContainer>
    </main>
  );
}
