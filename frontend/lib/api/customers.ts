import { apiClient, unwrap } from "./client";
import type { CustomerDetail, CustomerListItem, ListCustomersParams, Paginated } from "@/types";

/** GET /api/v1/users/customers/ — staff-only customer directory ("fiche
 * client" list): order count, lifetime spend, loyalty tier, and outstanding
 * credit balance per customer. */
export async function listCustomers(params: ListCustomersParams = {}): Promise<Paginated<CustomerListItem>> {
  const res = await apiClient.get("/users/customers/", { params });
  return unwrap<Paginated<CustomerListItem>>(res);
}

/** GET /api/v1/users/customers/{id}/ — full fiche client: profile, loyalty,
 * recent order history, and credit ledger. */
export async function getCustomer(customerId: number): Promise<CustomerDetail> {
  const res = await apiClient.get(`/users/customers/${customerId}/`);
  return unwrap<CustomerDetail>(res);
}
