/** Mirrors apps.inventory.models.InventoryCategory */
export type InventoryCategory = "DETERGENT" | "SOFTENER" | "PACKAGING" | "EQUIPMENT" | "OTHER";

/** Mirrors apps.inventory.models.InventoryUnit */
export type InventoryUnit = "L" | "KG" | "PCS" | "ML";

/** Mirrors apps.inventory.models.InventoryTransaction.ChangeType */
export type InventoryChangeType = "RESTOCK" | "USAGE" | "ADJUSTMENT";

/** Mirrors apps.inventory.api.serializers.inventory.InventoryItemSerializer */
export interface InventoryItem {
  id: number;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  quantity: string; // DecimalField serializes as string; read-only — see InventoryItemInput
  low_stock_threshold: string;
  notes: string;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

/** Payload for POST /api/v1/inventory/items/ and PATCH .../{id}/ — `quantity`
 * is intentionally not settable here; it only changes via a logged
 * InventoryTransaction (see adjustInventoryItem). */
export interface InventoryItemInput {
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  low_stock_threshold?: number;
  notes?: string;
}

/** Query params for GET /api/v1/inventory/items/ */
export interface ListInventoryItemsParams {
  page?: number;
  category?: InventoryCategory;
  search?: string;
}

/** Mirrors apps.inventory.api.serializers.inventory.InventoryTransactionSerializer */
export interface InventoryTransaction {
  id: number;
  item: number;
  change_type: InventoryChangeType;
  quantity_change: string;
  reason: string;
  created_by: string | null; // StringRelatedField
  created_at: string;
}

/** Payload for POST /api/v1/inventory/items/{id}/adjust/ — RESTOCK requires a
 * positive quantity_change, USAGE requires a negative one. */
export interface AdjustInventoryItemInput {
  change_type: InventoryChangeType;
  quantity_change: number;
  reason?: string;
}
