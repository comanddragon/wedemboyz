/** Mirrors apps.inventory.models.InventoryCategory */
export type InventoryCategory =
  | "DETERGENT" | "SOFTENER" | "PACKAGING" | "EQUIPMENT"
  | "STAIN_REMOVER" | "BLEACH" | "HANGERS" | "BAGS"
  | "MACHINE_PARTS" | "CLEANING" | "OTHER";

/** Mirrors apps.inventory.models.InventoryUnit */
export type InventoryUnit = "L" | "KG" | "PCS" | "ML" | "G" | "PACK" | "BOX" | "ROLL";

/** Mirrors apps.inventory.models.InventoryTransaction.ChangeType */
export type InventoryChangeType =
  | "RESTOCK" | "USAGE" | "ADJUSTMENT" | "WASTE" | "DAMAGED"
  | "RETURN_TO_SUPPLIER" | "TRANSFER" | "OPENING_STOCK";

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  notes: string;
  is_active: boolean;
}

/** Mirrors apps.inventory.api.serializers.inventory.InventoryItemSerializer */
export interface InventoryItem {
  id: number;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  quantity: string; // DecimalField serializes as string; read-only — see InventoryItemInput
  low_stock_threshold: string;
  notes: string;
  unit_cost: string;
  last_purchase_cost: string;
  average_cost: string;
  stock_value: string;
  sku: string | null;
  barcode: string | null;
  supplier: number | null;
  supplier_detail: Supplier | null;
  brand: string;
  pack_size: string | null;
  pack_unit: InventoryUnit | "";
  reorder_quantity: string;
  storage_location: string;
  expiry_tracking: boolean;
  expires_on: string | null;
  is_active: boolean;
  image: string | null;
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
  unit_cost?: number;
  sku?: string | null;
  barcode?: string | null;
  supplier?: number | null;
  brand?: string;
  pack_size?: number | null;
  pack_unit?: InventoryUnit | "";
  reorder_quantity?: number;
  storage_location?: string;
  expiry_tracking?: boolean;
  expires_on?: string | null;
  is_active?: boolean;
}

/** Query params for GET /api/v1/inventory/items/ */
export interface ListInventoryItemsParams {
  page?: number;
  category?: InventoryCategory;
  search?: string;
  low_stock?: boolean;
  supplier?: number;
  is_active?: boolean;
  ordering?: string;
  expiring_before?: string;
}

/** Mirrors apps.inventory.api.serializers.inventory.InventoryTransactionSerializer */
export interface InventoryTransaction {
  id: number;
  item: number;
  change_type: InventoryChangeType;
  quantity_change: string;
  reason: string;
  item_name: string;
  unit_cost: string | null;
  total_cost: string;
  supplier: number | null;
  supplier_name: string | null;
  reference: string;
  quantity_before: string;
  quantity_after: string;
  order: number | null;
  machine: number | null;
  batch: string;
  created_by: { id: number; name: string } | null;
  created_at: string;
}

/** Payload for POST /api/v1/inventory/items/{id}/adjust/ — RESTOCK requires a
 * positive quantity_change, USAGE requires a negative one. */
export interface AdjustInventoryItemInput {
  change_type: InventoryChangeType;
  quantity_change: number;
  reason?: string;
  unit_cost?: number;
  supplier?: number | null;
  reference?: string;
}

export interface InventoryUsageInput {
  lines: Array<{ item: number; quantity: number }>;
  order?: number | null;
  machine?: number | null;
  batch?: string;
  reason?: string;
}

export interface InventoryValuation {
  total_value: string;
  categories: Array<{ category: InventoryCategory; value: string; item_count: number }>;
  as_of: string;
}
