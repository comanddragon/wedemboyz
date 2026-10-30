import { BUSINESS, formatCurrency } from "@/src/lib/constants";
import type { OrderDetail } from "@/src/types";

interface WhatsAppOrderContext {
  customerName?: string;
  customerPhone?: string;
  pickupDate?: string | null;
  pickupSlot?: string | null;
}

function readableService(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ownerWhatsAppOrderUrl(
  order: OrderDetail,
  context: WhatsAppOrderContext = {},
): string {
  const customerName =
    context.customerName?.trim() ||
    [order.customer?.first_name, order.customer?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Customer";
  const customerPhone =
    context.customerPhone?.trim() ||
    order.customer?.phone_number ||
    "Not provided";
  const items = order.items.flatMap((item) => {
    const title = item.label || readableService(item.service_type);
    const weight = item.weight_kg ? ` (${item.weight_kg} kg each)` : "";
    const lines = [
      `• ${item.quantity} × ${title}${weight} — ${formatCurrency(item.subtotal)}`,
    ];
    if (item.description) lines.push(`  Note: ${item.description}`);
    return lines;
  });
  const schedule =
    context.pickupDate && context.pickupSlot
      ? [`Pickup schedule: ${context.pickupDate}, ${context.pickupSlot}`]
      : [];
  const message = [
    `🧺 New order ${order.ticket_number || `#${order.id}`}`,
    "",
    `Customer: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Fulfilment: ${order.fulfillment_type === "PICKUP" ? "Pickup" : "Drop-off"}`,
    `Payment: ${order.payment_option === "PAY_AT_PICKUP" ? "Pay on pickup" : "Pay on delivery"}`,
    ...schedule,
    "",
    "Items:",
    ...items,
    "",
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Discount: ${formatCurrency(order.discount_amount)}`,
    `Delivery: ${formatCurrency(order.delivery_fee)}`,
    `Total: ${formatCurrency(order.total_amount)}`,
    "",
    `Pickup address: ${order.pickup_address}`,
    `Delivery address: ${order.delivery_address}`,
    `Customer notes: ${order.notes || "None"}`,
  ].join("\n");

  return `${BUSINESS.whatsappHref}?text=${encodeURIComponent(message)}`;
}
