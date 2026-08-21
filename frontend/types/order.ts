import type { Currency, OrderStatus, PaymentGateway, ServiceType } from "./enums";

/** Mirrors apps.orders.api.serializers.order.OrderItemSerializer */
export interface OrderItem {
  id: number;
  service_type: ServiceType;
  label: string;
  description: string;
  weight_kg: string; // DecimalField serializes as string
  quantity: number;
  unit_price: string;
  subtotal: string;
}

/** Line item as submitted on order creation — mirrors OrderItemInputSerializer. */
export interface OrderItemInput {
  service_type: ServiceType;
  label?: string;
  description?: string;
  weight_kg: number;
  quantity?: number; // defaults to 1 server-side
}

/** Mirrors apps.orders.api.serializers.order.OrderStatusHistorySerializer */
export interface OrderStatusHistoryEntry {
  id: number;
  status: OrderStatus;
  note: string;
  changed_by: string | null; // StringRelatedField -> display string or null
  created_at: string;
}

/** Mirrors apps.orders.api.serializers.order.OrderCustomerSerializer (nested summary) */
export interface OrderCustomerSummary {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
}

/** Mirrors apps.orders.api.serializers.order.OrderListSerializer (GET /orders/) */
export interface OrderListItem {
  id: number;
  status: OrderStatus;
  subtotal: string;
  discount_amount: string;
  delivery_fee: string;
  total_amount: string;
  currency: Currency;
  item_count: number;
  has_schedule: boolean;
  created_at: string;
  /** NOT currently sent by the backend — OrderListSerializer only exposes
   * fields on the order itself today, nothing about who placed it. Add a
   * nested `customer` (id/first_name/last_name) to the serializer and the
   * admin orders table's Customer column starts populating with no
   * further frontend changes. */
  customer?: OrderCustomerSummary;
}

/** Mirrors apps.orders.api.serializers.order.OrderDetailSerializer */
export interface OrderDetail {
  id: number;
  user: number;
  status: OrderStatus;
  pickup_address: string;
  delivery_address: string;
  notes: string;
  subtotal: string;
  discount_amount: string;
  delivery_fee: string;
  total_amount: string;
  currency: Currency;
  items: OrderItem[];
  status_history: OrderStatusHistoryEntry[];
  has_schedule: boolean;
  created_at: string;
  updated_at: string;
  /** NOT currently sent by the backend — only the bare `user` id above is.
   * See OrderListItem.customer. */
  customer?: OrderCustomerSummary;
}

/** Payload for POST /orders/ — mirrors OrderCreateSerializer's writable fields. */
export interface CreateOrderInput {
  pickup_address: string;
  delivery_address: string;
  notes?: string;
  items: OrderItemInput[];
  promo_code?: string;
}

/** Payload for PATCH /orders/{id}/ — only while status is PENDING (or staff). */
export type UpdateOrderInput = Partial<Pick<OrderDetail, "pickup_address" | "delivery_address" | "notes">>;

/** Payload for POST /orders/{id}/status/ — staff/driver only. */
export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
}

// --- Quick sale / POS ("Nouvelle vente") --------------------------------------

/** A walk-in sale line item — mirrors QuickSaleItemInputSerializer. Unlike
 * the online booking flow, weight defaults to 1kg and staff can override the
 * computed price directly (useful for flat-rate items or negotiated pricing). */
export interface QuickSaleItemInput {
  service_type: ServiceType;
  label?: string;
  description?: string;
  /** Defaults to 1.0 server-side if omitted. */
  weight_kg?: number;
  /** Defaults to 1 server-side. */
  quantity?: number;
  /** Omit to auto-price via services.pricing. */
  unit_price?: number | null;
}

/** Payload for POST /orders/quick-sale/ — staff-only walk-in sale. Finds or
 * creates the customer by phone (unusable password if new). */
export interface QuickSaleInput {
  customer_phone: string;
  /** Only used if the customer doesn't already exist. */
  customer_name?: string;
  items: QuickSaleItemInput[];
  payment_method: PaymentGateway;
  /** false, or payment_method="CREDIT", records it on the customer's credit
   * tab instead of creating an immediate Payment. Defaults to true. */
  paid_now?: boolean;
  delivery_fee?: number;
  notes?: string;
}

/** Response shape from StaffQuickSaleView. */
export interface QuickSaleResult {
  order: OrderDetail;
  on_credit: boolean;
}
