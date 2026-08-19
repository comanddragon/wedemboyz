import { apiClient, unwrap } from "./client";
import type {
  AddPaymentMethodInput,
  CreateRefundInput,
  CreateSubscriptionInput,
  InitiatePaymentInput,
  Invoice,
  Paginated,
  Payment,
  PaymentMethod,
  Refund,
  Subscription,
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResult,
} from "@/types";

// --- Payment methods --------------------------------------------------------

/** GET /payments/methods/ */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const res = await apiClient.get("/payments/methods/");
  return unwrap<PaymentMethod[]>(res);
}

/** POST /payments/methods/ */
export async function addPaymentMethod(input: AddPaymentMethodInput): Promise<PaymentMethod> {
  const res = await apiClient.post("/payments/methods/", input);
  return unwrap<PaymentMethod>(res);
}

/** DELETE /payments/methods/{id}/ */
export async function removePaymentMethod(methodId: number): Promise<void> {
  await apiClient.delete(`/payments/methods/${methodId}/`);
}

/** POST /payments/methods/{id}/set-default/ */
export async function setDefaultPaymentMethod(methodId: number): Promise<PaymentMethod> {
  const res = await apiClient.post(`/payments/methods/${methodId}/set-default/`);
  return unwrap<PaymentMethod>(res);
}

// --- Payments ----------------------------------------------------------------

/** GET /payments/ */
export async function listPayments(page = 1): Promise<Paginated<Payment>> {
  const res = await apiClient.get("/payments/", { params: { page } });
  return unwrap<Paginated<Payment>>(res);
}

/** POST /payments/ — amount is derived server-side from the order total. */
export async function initiatePayment(input: InitiatePaymentInput): Promise<Payment> {
  const res = await apiClient.post("/payments/", input);
  return unwrap<Payment>(res);
}

/** GET /payments/{id}/ */
export async function getPayment(paymentId: number): Promise<Payment> {
  const res = await apiClient.get(`/payments/${paymentId}/`);
  return unwrap<Payment>(res);
}

// --- Invoices ------------------------------------------------------------------

/** GET /invoices/ */
export async function listInvoices(page = 1): Promise<Paginated<Invoice>> {
  const res = await apiClient.get("/invoices/", { params: { page } });
  return unwrap<Paginated<Invoice>>(res);
}

/** GET /invoices/{id}/ */
export async function getInvoice(invoiceId: number): Promise<Invoice> {
  const res = await apiClient.get(`/invoices/${invoiceId}/`);
  return unwrap<Invoice>(res);
}

// --- Refunds ---------------------------------------------------------------

/** GET /refunds/ */
export async function listRefunds(page = 1): Promise<Paginated<Refund>> {
  const res = await apiClient.get("/refunds/", { params: { page } });
  return unwrap<Paginated<Refund>>(res);
}

/** POST /refunds/ — customer requests a refund on a payment. */
export async function requestRefund(input: CreateRefundInput): Promise<Refund> {
  const res = await apiClient.post("/refunds/", input);
  return unwrap<Refund>(res);
}

// --- Subscriptions -----------------------------------------------------------

/** GET /subscriptions/ — unpaginated on the backend (see
 * SubscriptionListCreateView), but normalized here defensively in case that
 * ever changes, since every caller (dashboard, /subscription) expects a
 * bare array. */
export async function listSubscriptions(): Promise<Subscription[]> {
  const res = await apiClient.get("/subscriptions/");
  const data = unwrap<Subscription[] | { results: Subscription[] }>(res);
  return Array.isArray(data) ? data : data.results;
}

/** GET /subscriptions/{id}/ */
export async function getSubscription(subscriptionId: number): Promise<Subscription> {
  const res = await apiClient.get(`/subscriptions/${subscriptionId}/`);
  return unwrap<Subscription>(res);
}

/** POST /subscriptions/ — creates a PENDING subscription with no pickups
 * granted yet; call startSubscriptionCheckout next to actually pay for it. */
export async function createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
  const res = await apiClient.post("/subscriptions/", input);
  return unwrap<Subscription>(res);
}

/** POST /subscriptions/{id}/checkout/ — starts payment against the chosen
 * gateway. MONTHLY subscriptions only accept STRIPE/PAYPAL. Stripe/PayPal
 * responses include a redirect URL — send the browser there next; MTN/Orange
 * return the created Payment and rely on the same collection-request flow
 * used for order payments. */
export async function startSubscriptionCheckout(
  subscriptionId: number,
  input: SubscriptionCheckoutInput
): Promise<SubscriptionCheckoutResult> {
  const res = await apiClient.post(`/subscriptions/${subscriptionId}/checkout/`, input);
  return unwrap<SubscriptionCheckoutResult>(res);
}

/** POST /subscriptions/{id}/pause/ — ONE_TIME subscriptions only. */
export async function pauseSubscription(subscriptionId: number): Promise<Subscription> {
  const res = await apiClient.post(`/subscriptions/${subscriptionId}/pause/`);
  return unwrap<Subscription>(res);
}

/** POST /subscriptions/{id}/resume/ — ONE_TIME subscriptions only. */
export async function resumeSubscription(subscriptionId: number): Promise<Subscription> {
  const res = await apiClient.post(`/subscriptions/${subscriptionId}/resume/`);
  return unwrap<Subscription>(res);
}

/** POST /subscriptions/{id}/cancel/ — MONTHLY subscriptions keep access
 * through the period already paid for (cancel_at_period_end is set rather
 * than an immediate cutoff); ONE_TIME cancels immediately. */
export async function cancelSubscription(subscriptionId: number): Promise<Subscription> {
  const res = await apiClient.post(`/subscriptions/${subscriptionId}/cancel/`);
  return unwrap<Subscription>(res);
}
