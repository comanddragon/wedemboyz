import { apiClient, unwrap } from "./client";
import type {
  AdjustInventoryItemInput,
  InventoryItem,
  InventoryItemInput,
  InventoryTransaction,
  ListInventoryItemsParams,
  Paginated,
} from "@/types";

/** GET /api/v1/inventory/items/?category=&search= */
export async function listInventoryItems(
  params: ListInventoryItemsParams = {}
): Promise<Paginated<InventoryItem>> {
  const res = await apiClient.get("/inventory/items/", { params });
  return unwrap<Paginated<InventoryItem>>(res);
}

/** POST /api/v1/inventory/items/ */
export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  const res = await apiClient.post("/inventory/items/", input);
  return unwrap<InventoryItem>(res);
}

/** GET /api/v1/inventory/items/low-stock/ */
export async function listLowStockItems(): Promise<Paginated<InventoryItem>> {
  const res = await apiClient.get("/inventory/items/low-stock/");
  return unwrap<Paginated<InventoryItem>>(res);
}

/** GET /api/v1/inventory/items/{id}/ */
export async function getInventoryItem(itemId: number): Promise<InventoryItem> {
  const res = await apiClient.get(`/inventory/items/${itemId}/`);
  return unwrap<InventoryItem>(res);
}

/** PATCH /api/v1/inventory/items/{id}/ — note `quantity` isn't settable here;
 * see adjustInventoryItem. */
export async function updateInventoryItem(
  itemId: number,
  input: Partial<InventoryItemInput>
): Promise<InventoryItem> {
  const res = await apiClient.patch(`/inventory/items/${itemId}/`, input);
  return unwrap<InventoryItem>(res);
}

/** DELETE /api/v1/inventory/items/{id}/ */
export async function deleteInventoryItem(itemId: number): Promise<void> {
  await apiClient.delete(`/inventory/items/${itemId}/`);
}

/** POST /api/v1/inventory/items/{id}/adjust/ — restock, log usage, or
 * correct a stocktake discrepancy. Always logged as an InventoryTransaction
 * (never edits `quantity` directly), so crossing the low-stock threshold
 * reliably triggers the staff notification pipeline. */
export async function adjustInventoryItem(
  itemId: number,
  input: AdjustInventoryItemInput
): Promise<InventoryItem> {
  const res = await apiClient.post(`/inventory/items/${itemId}/adjust/`, input);
  return unwrap<InventoryItem>(res);
}

/** GET /api/v1/inventory/items/{id}/transactions/ */
export async function listInventoryItemTransactions(itemId: number): Promise<Paginated<InventoryTransaction>> {
  const res = await apiClient.get(`/inventory/items/${itemId}/transactions/`);
  return unwrap<Paginated<InventoryTransaction>>(res);
}
