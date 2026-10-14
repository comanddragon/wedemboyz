/** Mirrors core.constants.Currency */
export type Currency = "XAF";

/** Mirrors core.constants.ServiceType. Source of truth: the "NOUVEAUX PRIX"
 * (per-piece pressing) and "GRILLE DE PRIX" (per-kg lavomatique) flyers —
 * see services/pricing.py PRICE_PER_PIECE / PRICE_PER_KG. */
export type ServiceType =
  // Per-piece pressing/garment-care items ("NOUVEAUX PRIX" flyer) — flat
  // price per piece, weight_kg is recorded for logistics only.
  | "VESTE"
  | "TSHIRT"
  | "CHEMISE"
  | "PANTALON"
  | "PULL"
  | "ROBE"
  | "ENSEMBLE"
  | "DRAPS_COMPLET"
  | "COUETTE_1P"
  | "COUETTE_2P"
  | "COUETTE_3P"
  // Per-kg self-service lavomatique lines ("GRILLE DE PRIX" flyer).
  | "LAVAGE_ESSORAGE"
  | "LAVAGE_SECHAGE"
  | "REPASSAGE_PLASTIF";

/** Mirrors core.constants.OrderStatus */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

/** Mirrors core.constants.PaymentStatus */
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

/** Mirrors core.constants.PaymentGateway. `CREDIT` ("Pay Later / Store
 * Credit") was added alongside the quick-sale/POS endpoint — see
 * QuickSaleInput in types/order.ts and finance's CreditAccount. */
export type PaymentGateway = "STRIPE" | "PAYPAL" | "MTN_MOMO" | "ORANGE_MONEY" | "CASH" | "CREDIT";

/** Gateways that can bill a subscription. Mirrors
 * apps.payments.api.serializers.subscription.ONE_TIME_GATEWAYS. */
export type SubscriptionGateway = "STRIPE" | "PAYPAL" | "MTN_MOMO" | "ORANGE_MONEY";

/** Gateways capable of MONTHLY auto-billing. Mirrors
 * apps.payments.models.Subscription.RECURRING_CAPABLE_GATEWAYS — MTN/Orange
 * have no recurring-mandate API here, so they're one-time-only. */
export const RECURRING_CAPABLE_GATEWAYS: SubscriptionGateway[] = ["STRIPE", "PAYPAL"];

/** Order statuses a customer (non-staff) is allowed to reach via cancellation.
 * Mirrors services.order_flow.CUSTOMER_CANCELLABLE_FROM on the backend —
 * keep in sync if that changes. */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

/** Statuses in which order.pickup_address/delivery_address/notes can still be edited.
 * Mirrors EDITABLE_STATUSES in apps.orders.api.views.order. */
export const EDITABLE_ORDER_STATUSES: OrderStatus[] = ["PENDING"];
