"use client";

import { useQuery } from "@tanstack/react-query";

import { customersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ListCustomersParams } from "@/types";

/** GET /api/v1/users/customers/ — staff-only customer directory. */
export function useCustomers(params: ListCustomersParams = {}) {
  const listQuery = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customersApi.listCustomers(params),
  });

  return {
    customers: listQuery.data?.results ?? [],
    count: listQuery.data?.count ?? 0,
    hasNextPage: Boolean(listQuery.data?.next),
    hasPreviousPage: Boolean(listQuery.data?.previous),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
  };
}

/** GET /api/v1/users/customers/{id}/ — full fiche client. */
export function useCustomer(customerId: number | undefined) {
  const detailQuery = useQuery({
    queryKey: queryKeys.customers.detail(customerId as number),
    queryFn: () => customersApi.getCustomer(customerId as number),
    enabled: typeof customerId === "number",
  });

  return {
    customer: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
  };
}
