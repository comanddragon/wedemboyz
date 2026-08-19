import { apiClient, unwrap } from "./client";
import type {
  CreateOrderInput,
  OrderDetail,
  OrderListItem,
  Paginated,
  QuickSaleInput,
  QuickSaleResult,
  UpdateOrderInput,
  UpdateOrderStatusInput,
} from "@/types";

/** GET /orders/ — the current user's orders (staff see all). */
export async function listOrders(page = 1): Promise<Paginated<OrderListItem>> {
  const res = await apiClient.get("/orders/", { params: { page } });
  return unwrap<Paginated<OrderListItem>>(res);
}

/** POST /orders/ — pricing/delivery fee/promo are all computed server-side. */
export async function createOrder(input: CreateOrderInput): Promise<OrderDetail> {
  const res = await apiClient.post("/orders/", input);
  return unwrap<OrderDetail>(res);
}

/** GET /orders/{id}/ */
export async function getOrder(orderId: number): Promise<OrderDetail> {
  const res = await apiClient.get(`/orders/${orderId}/`);
  return unwrap<OrderDetail>(res);
}

/** PATCH /orders/{id}/ — only while order.status is still editable (see
 * types/enums.ts EDITABLE_ORDER_STATUSES); the backend enforces this too. */
export async function updateOrder(orderId: number, input: UpdateOrderInput): Promise<OrderDetail> {
  const res = await apiClient.patch(`/orders/${orderId}/`, input);
  return unwrap<OrderDetail>(res);
}

/** POST /orders/{id}/cancel/ — customer self-service cancel. */
export async function cancelOrder(orderId: number): Promise<OrderDetail> {
  const res = await apiClient.post(`/orders/${orderId}/cancel/`);
  return unwrap<OrderDetail>(res);
}

/** POST /orders/{id}/status/ — staff/driver only; validated against
 * services.order_flow.ALLOWED_TRANSITIONS server-side. */
export async function updateOrderStatus(orderId: number, input: UpdateOrderStatusInput): Promise<OrderDetail> {
  const res = await apiClient.post(`/orders/${orderId}/status/`, input);
  return unwrap<OrderDetail>(res);
}

/** POST /orders/quick-sale/ — staff-only walk-in sale ("Nouvelle vente"),
 * bypassing the online booking flow. Finds or creates the customer by
 * phone, prices items automatically unless overridden, and either records
 * an immediate payment or a credit-tab charge depending on `payment_method`
 * / `paid_now`. */
export async function createQuickSale(input: QuickSaleInput): Promise<QuickSaleResult> {
  const res = await apiClient.post("/orders/quick-sale/", input);
  return unwrap<QuickSaleResult>(res);
}
