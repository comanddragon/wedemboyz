import type { OrderItemInput } from "@/src/types";

/** Required order-create fields and limits from the API serializer. */
export function bookingValidationError(booking: {
  items: OrderItemInput[];
  orderType: string;
  pickupAddress: string;
  deliveryAddress: string;
}): string | null {
  if (!booking.items.length) return "booking.requiredItems";
  if (booking.orderType === "pickup" && !booking.pickupAddress.trim()) return "booking.requiredPickup";
  if (!booking.deliveryAddress.trim()) return "booking.requiredDelivery";
  if (booking.pickupAddress.trim().length > 255 || booking.deliveryAddress.trim().length > 255) return "booking.addressTooLong";
  if (booking.items.some((item) => !Number.isInteger(item.quantity ?? 1) || (item.quantity ?? 1) < 1 || (item.label?.trim().length ?? 0) > 100 || (item.weight_kg != null && (!Number.isFinite(item.weight_kg) || item.weight_kg < 0.1 || item.weight_kg > 999.99)))) return "booking.invalidItems";
  return null;
}
