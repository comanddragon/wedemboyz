import type { PaymentMethodType } from "@/src/types";

export const COLLECTION_METHODS: Array<{
  value: PaymentMethodType;
  label: string;
}> = [
  { value: "PAY_AT_PICKUP", label: "Pay on pickup" },
  { value: "PAY_AFTER_DELIVERY", label: "Pay on delivery" },
];
export function collectionMethods(locale: string) {
  return COLLECTION_METHODS.map((method) => ({
    ...method,
    label:
      locale === "fr"
        ? method.value === "PAY_AT_PICKUP"
          ? "Paiement à la collecte"
          : "Paiement à la livraison"
        : method.label,
  }));
}
export function paymentState(status: string): "PAID" | "UNPAID" {
  return ["PAID", "OVERPAID", "NO_CHARGE", "SUCCEEDED"].includes(status)
    ? "PAID"
    : "UNPAID";
}
