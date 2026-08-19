import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { OrderCustomerSummary } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "Jane Doe" from a nested customer summary, or null if the backend hasn't
 * sent one yet (see OrderListItem.customer in types/order.ts) — callers
 * decide their own fallback (e.g. "Customer #12", "—"). */
export function customerFullName(customer: OrderCustomerSummary | null | undefined): string | null {
  if (!customer) return null;
  const name = `${customer.first_name} ${customer.last_name}`.trim();
  return name || null;
}

/** Phone number with the leading 237 (Cameroon) country code stripped, e.g.
 * "+237 6XX XXX XXX" or "237 6XX XXX XXX" -> "6XX XXX XXX". Returns null if
 * there's no customer or no phone number. */
export function customerNumber(customer: OrderCustomerSummary | null | undefined): string | null {
  if (!customer) return null;
  const number = customer.phone_number.trim().replace(/^\+?237\s*/, "");
  return number || null;
}

/** Masks all but the last 4 digits of a phone number for display, e.g.
 * "237654599603" -> "•••• 9603". Used when offering a phone number as a
 * checkout shortcut without printing the whole thing on screen. */
export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return `•••• ${digits.slice(-4)}`;
}
