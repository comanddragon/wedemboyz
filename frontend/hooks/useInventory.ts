"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { inventoryApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AdjustInventoryItemInput, InventoryItemInput, ListInventoryItemsParams } from "@/types";

/** GET/POST/PATCH/DELETE /api/v1/inventory/items/ */
export function useInventoryItems(params: ListInventoryItemsParams = {}) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.items.list(params),
    queryFn: () => inventoryApi.listInventoryItems(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });

  const createMutation = useMutation({
    mutationFn: (input: InventoryItemInput) => inventoryApi.createInventoryItem(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, input }: { itemId: number; input: Partial<InventoryItemInput> }) =>
      inventoryApi.updateInventoryItem(itemId, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => inventoryApi.deleteInventoryItem(itemId),
    onSuccess: invalidate,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ itemId, input }: { itemId: number; input: AdjustInventoryItemInput }) =>
      inventoryApi.adjustInventoryItem(itemId, input),
    onSuccess: (_, { itemId }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.items.transactions(itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.items.lowStock });
    },
  });

  return {
    items: listQuery.data?.results ?? [],
    count: listQuery.data?.count ?? 0,
    hasNextPage: Boolean(listQuery.data?.next),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    createItem: createMutation.mutate,
    createItemAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateItem: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteItem: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    /** Restock, log usage, or correct a stocktake discrepancy — always
     * logged as an auditable InventoryTransaction. */
    adjustItem: adjustMutation.mutate,
    adjustItemAsync: adjustMutation.mutateAsync,
    isAdjusting: adjustMutation.isPending,
  };
}

/** GET /api/v1/inventory/items/low-stock/ */
export function useLowStockItems() {
  const query = useQuery({
    queryKey: queryKeys.inventory.items.lowStock,
    queryFn: () => inventoryApi.listLowStockItems(),
  });

  return {
    items: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** GET /api/v1/inventory/items/{id}/transactions/ */
export function useInventoryItemTransactions(itemId: number | undefined) {
  const query = useQuery({
    queryKey: queryKeys.inventory.items.transactions(itemId as number),
    queryFn: () => inventoryApi.listInventoryItemTransactions(itemId as number),
    enabled: typeof itemId === "number",
  });

  return {
    transactions: query.data?.results ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
