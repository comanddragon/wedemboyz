"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { InventoryAdjustForm } from "@/components/inventory/InventoryAdjustForm";
import { InventoryItemForm } from "@/components/inventory/InventoryItemForm";
import { Button, Card, StatusBadge } from "@/components/ui";
import { inventoryApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryCategory, InventoryChangeType } from "@/types";

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  DETERGENT: "Detergent",
  SOFTENER: "Softener",
  PACKAGING: "Packaging",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

const CHANGE_TYPE_LABELS: Record<InventoryChangeType, string> = {
  RESTOCK: "Restock",
  USAGE: "Usage",
  ADJUSTMENT: "Correction",
};

export default function AdminInventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const itemId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: item, isLoading, error } = useQuery({
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
    if (window.confirm(`Delete "${item?.name}"? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !item) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/admin/inventory" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to inventory
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/admin/inventory" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to inventory
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{item.name}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">{CATEGORY_LABELS[item.category]}</p>
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
              {item.quantity} <span className="text-sm font-normal text-ink-muted">{item.unit}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Low-stock threshold: {item.low_stock_threshold} {item.unit}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setShowAdjustForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adjust stock
          </Button>
        </div>
        {item.notes && <p className="mt-3 border-t border-crease pt-3 text-sm text-ink-muted">{item.notes}</p>}
      </Card>

      {showAdjustForm && (
        <div className="mb-3">
          <InventoryAdjustForm item={item} onDone={() => setShowAdjustForm(false)} />
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowEditForm((v) => !v)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {showEditForm ? "Close" : "Edit details"}
        </Button>
        <Button variant="ghost" onClick={handleDelete} disabled={deleteMutation.isPending}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {deleteMutation.isPending ? "Deleting…" : "Delete item"}
        </Button>
      </div>

      {deleteError && <p className="mb-4 text-sm text-status-cancelled-text">{deleteError}</p>}

      {showEditForm && (
        <div className="mb-6">
          <InventoryItemForm item={item} onDone={() => setShowEditForm(false)} />
        </div>
      )}

      <h2 className="font-display mb-3 text-sm font-medium text-ink">Transaction history</h2>
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
          {!transactionsLoading && transactions && transactions.results.length === 0 && (
            <TableEmptyRow colSpan={5}>No stock changes recorded yet.</TableEmptyRow>
          )}
          {!transactionsLoading &&
            transactions?.results.map((tx) => {
              const change = Number(tx.quantity_change);
              return (
                <Tr key={tx.id}>
                  <Td>{CHANGE_TYPE_LABELS[tx.change_type]}</Td>
                  <Td align="right" className={`tabular-nums ${change >= 0 ? "text-status-ready-text" : "text-status-cancelled-text"}`}>
                    {change >= 0 ? "+" : ""}
                    {tx.quantity_change} {item.unit}
                  </Td>
                  <Td className="text-ink-muted">{tx.reason || <span>—</span>}</Td>
                  <Td className="text-ink-muted">{tx.created_by || <span>—</span>}</Td>
                  <Td align="right" className="whitespace-nowrap text-ink-muted">
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
