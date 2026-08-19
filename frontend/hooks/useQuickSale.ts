"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ordersApi } from "@/lib/api";
import type { QuickSaleInput } from "@/types";

/**
 * POST /api/v1/orders/quick-sale/ — staff-only walk-in sale ("Nouvelle
 * vente"). On success, invalidates the orders list (a new CONFIRMED order
 * was created) and, when the sale was paid immediately, the finance
 * analytics summary/revenue queries. Credit-tab sales invalidate the credit
 * account for that customer instead — pass `customerUserId` when known
 * (e.g. the customer already exists) so that cache also refreshes.
 */
export function useQuickSale() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: QuickSaleInput) => ordersApi.createQuickSale(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (result.on_credit) {
        queryClient.invalidateQueries({ queryKey: ["finance", "credit-accounts"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
      }
    },
  });

  return {
    createQuickSale: mutation.mutate,
    createQuickSaleAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    result: mutation.data,
  };
}
