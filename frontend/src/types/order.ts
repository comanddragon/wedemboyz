import type {
  Currency,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethodType,
  ServiceType,
} from "./enums";

/** Mirrors apps.orders.api.serializers.order.OrderItemSerializer */
export interface OrderItem {
  id: number;
  service_type: ServiceType;
  label: string;
  description: string;
  status: "RECEIVED" | "WASHED" | "PRESSED" | "PACKED";
  condition_notes: string;
  stain_notes: string;
  photo: string | null;
  photos: Array<{ id: number; image: string; created_at: string }>;
  weight_kg: string | null; // Piece-priced items do not require weight
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
  /** Optional intake photos. Sent as multipart data when the order is created. */
  photos?: File[];
  /** Local-only preview URLs used while moving through the booking wizard. */
  photoPreviewUrls?: string[];
}

/** Mirrors apps.orders.api.serializers.order.OrderStatusHistorySerializer */
export interface OrderStatusHistoryEntry {
  id: number;
  status: OrderStatus;
  note: string;
  changed_by: string | null; // StringRelatedField -> display string or null
  created_at: string;
}

export interface OrderPaymentHistoryEntry {
  id: number;
  from_status: OrderPaymentStatus | "";
  to_status: OrderPaymentStatus;
  amount: string;
  reason: string;
  changed_by: string | null;
  created_at: string;
}

/** Mirrors apps.orders.api.serializers.order.OrderCustomerSerializer (nested summary) */
export interface OrderCustomerSummary {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar: string | null;
  use_profile_photo: boolean;
}

/** Mirrors apps.orders.api.serializers.order.OrderListSerializer (GET /orders/) */
export interface OrderListItem {
  id: number;
  status: OrderStatus;
  source: "ONLINE" | "WALK_IN" | "PHONE" | "STAFF";
  priority: "NORMAL" | "EXPRESS" | "URGENT";
  is_express: boolean;
  ticket_number: string | null;
  tag_number: string;
  assigned_to: number | null;
  driver: number | null;
  subtotal: string;
  discount_amount: string;
  delivery_fee: string;
  total_amount: string;
  payment_status: OrderPaymentStatus;
  amount_paid: string;
  balance_due: string;
  payment_due_date: string | null;
  currency: Currency;
  item_count: number;
  pieces_count: number;
  weight_kg_total: string;
  has_schedule: boolean;
  discount_campaign?: number | null;
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
  fulfillment_type: "PICKUP" | "DROP_OFF";
  payment_option: "PAY_AT_PICKUP" | "PAY_AFTER_DELIVERY";
  notes: string;
  internal_notes: string;
  source: "ONLINE" | "WALK_IN" | "PHONE" | "STAFF";
  created_by: number | null;
  assigned_to: number | null;
  driver: number | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancel_reason: string;
  ready_at: string | null;
  delivered_at: string | null;
  expected_ready_at: string | null;
  ticket_number: string | null;
  tag_number: string;
  priority: "NORMAL" | "EXPRESS" | "URGENT";
  is_express: boolean;
  pieces_count: number;
  weight_kg_total: string;
  subtotal: string;
  discount_amount: string;
  delivery_fee: string;
  total_amount: string;
  payment_status: OrderPaymentStatus;
  amount_paid: string;
  balance_due: string;
  paid_at: string | null;
  payment_due_date: string | null;
  payment_waived_reason: string;
  currency: Currency;
  items: OrderItem[];
  status_history: OrderStatusHistoryEntry[];
  payment_history: OrderPaymentHistoryEntry[];
  has_schedule: boolean;
  discount_campaign?: number | null;
  created_at: string;
  updated_at: string;
  /** NOT currently sent by the backend — only the bare `user` id above is.
   * See OrderListItem.customer. */
  customer?: OrderCustomerSummary;
}

/** Payload for POST /orders/ — mirrors OrderCreateSerializer's writable fields. */
export interface CreateOrderInput {
  fulfillment_type: "PICKUP" | "DROP_OFF";
  payment_option: "PAY_AT_PICKUP" | "PAY_AFTER_DELIVERY";
  pickup_address: string;
  delivery_address: string;
  notes?: string;
  items: OrderItemInput[];
  promo_code?: string;
}

/** Payload for PATCH /orders/{id}/ — only while status is PENDING (or staff). */
export type UpdateOrderInput = Partial<
  Pick<
    OrderDetail,
    | "pickup_address"
    | "delivery_address"
    | "notes"
    | "internal_notes"
    | "expected_ready_at"
    | "tag_number"
    | "priority"
    | "is_express"
  >
>;

/** Payload for POST /orders/{id}/status/ — staff/driver only. */
export interface UpdateOrderStatusInput {
  status: OrderStatus;
  note?: string;
  allow_unpaid_delivery?: boolean;
}

export interface UpdateOrderItemInput {
  service_type?: ServiceType;
  label?: string;
  description?: string;
  status?: OrderItem["status"];
  condition_notes?: string;
  stain_notes?: string;
  weight_kg?: number | null;
  quantity?: number;
  unit_price?: number;
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
  payment_method: PaymentMethodType;
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
