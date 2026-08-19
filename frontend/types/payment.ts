import type { Currency, PaymentGateway, PaymentStatus, SubscriptionGateway } from "./enums";
import {OrderCustomerSummary} from "@/types/order";

/** Mirrors apps.payments.api.serializers.payment.PaymentMethodSerializer */
export interface PaymentMethod {
  id: number;
  gateway: PaymentGateway;
  display_label: string;
  is_default: boolean;
  created_at: string;
}

/** Payload for POST /payments/methods/ — provider_token is write-only. */
export interface AddPaymentMethodInput {
  gateway: PaymentGateway;
  display_label: string;
  provider_token?: string;
}

/** Mirrors apps.payments.api.serializers.payment.PaymentSerializer */
export interface Payment {
  id: number;
  order: number | null;
  subscription: number | null;
  method: PaymentMethod | null;
  gateway: PaymentGateway;
  gateway_reference: string;
  amount: string;
  currency: Currency;
  status: PaymentStatus;
  paid_at: string | null;
  failure_reason: string;
  /** Only set (transiently) right after a MTN_MOMO/ORANGE_MONEY collection
   * request — the code to dial to confirm the payment on the customer's
   * phone. Empty string otherwise; not persisted server-side. */
  ussd_code: string;
  created_at: string;
    customer?: OrderCustomerSummary;

}

/** Payload for POST /payments/ — mirrors PaymentInitiateSerializer.
 * amount/currency are computed server-side from the order; never send them. */
export interface InitiatePaymentInput {
  order: number;
  gateway: PaymentGateway;
  method?: number | null;
  /** Required for MTN_MOMO/ORANGE_MONEY (CamPay pushes the USSD/PIN prompt
   * to this number); ignored for other gateways. Falls back to the user's
   * account phone_number if omitted. */
  phone_number?: string;
}

/** Mirrors apps.payments.api.serializers.invoice.InvoiceSerializer */
export interface Invoice {
  id: number;
  order: number;
  invoice_number: string;
  pdf_file: string | null;
  amount_due: string;
  amount_paid: string;
  is_settled: boolean;
  issued_at: string;
}

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

/** Mirrors apps.payments.models.Refund + its serializer */
export interface Refund {
  id: number;
  payment: number;
  amount: string;
  reason: string;
  status: RefundStatus;
  processed_at: string | null;
  created_at: string;
}

export interface CreateRefundInput {
  payment: number;
  amount: string;
  reason: string;
}

/** Mirrors apps.payments.models.Subscription.Plan. */
export type SubscriptionPlan = "ESSENTIEL" | "CONFORT" | "FAMILLE";
export type SubscriptionStatus = "PENDING" | "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type SubscriptionBillingCycle = "ONE_TIME" | "MONTHLY";

/** Mirrors apps.payments.models.Subscription + its serializer. A
 * subscription is created PENDING (no pickups granted) and only becomes
 * ACTIVE once checkout (see startSubscriptionCheckout) completes. */
export interface Subscription {
  id: number;
  plan: SubscriptionPlan;
  billing_cycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
  /** Kilos left for the current 30-day period — NOT a count of pickups.
   * DecimalField, serializes as a string. Doesn't roll over between
   * periods; usage beyond this is billed at standard per-kg rates. */
  kg_remaining: string;
  gateway: PaymentGateway | "";
  cancel_at_period_end: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

/** Payload for POST /subscriptions/ — start_date/end_date are computed
 * server-side; nothing else is required. */
export interface CreateSubscriptionInput {
  plan: SubscriptionPlan;
  billing_cycle?: SubscriptionBillingCycle;
}

/** Payload for POST /subscriptions/{id}/checkout/ — MONTHLY subscriptions
 * only accept STRIPE/PAYPAL; ONE_TIME accepts any SubscriptionGateway. */
export interface SubscriptionCheckoutInput {
  gateway: SubscriptionGateway;
  /** Required for MTN_MOMO/ORANGE_MONEY (CamPay pushes the USSD/PIN prompt
   * to this number); ignored for Stripe/PayPal. Falls back to the user's
   * account phone_number if omitted. */
  phone_number?: string;
}

/** Response shape varies by gateway:
 * - STRIPE: { checkout_url }
 * - PAYPAL: { approval_url }
 * - MTN_MOMO / ORANGE_MONEY: the created Payment (collection request is
 *   triggered the same way it already is for order payments) */
export type SubscriptionCheckoutResult =
  | { checkout_url: string }
  | { approval_url: string }
  | Payment;
