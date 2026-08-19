"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { discountsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { estimateBookingSubtotal, estimateDeliveryFee, useBookingStore } from "@/lib/stores/booking.store";

/**
 * Wraps booking.store.ts with the guide's "computed subtotal/discount/total"
 * fields (§11). Subtotal/delivery are client-side estimates (see
 * booking.store.ts); discount is real — it comes from POST /discounts/validate/
 * so the number shown at review time matches what the order will actually get.
 */
export function useBooking() {
  const store = useBookingStore();

  const subtotal = useMemo(() => estimateBookingSubtotal(store.items), [store.items]);
  const deliveryFee = useMemo(() => estimateDeliveryFee(subtotal), [subtotal]);

  const promoQuery = useQuery({
    queryKey: queryKeys.discounts.validate(store.promoCode ?? "", subtotal),
    queryFn: () => discountsApi.validatePromo({ code: store.promoCode as string, order_total: subtotal }),
    enabled: Boolean(store.promoCode) && subtotal > 0,
    retry: false,
  });

  const discount = promoQuery.data?.discount_amount ?? 0;
  const total = Math.max(subtotal + deliveryFee - discount, 0);

  return {
    ...store,
    subtotal,
    deliveryFee,
    discount,
    total,
    isPromoValid: promoQuery.isSuccess,
    promoError: promoQuery.isError ? "This promo code isn't valid for this order." : null,
    isValidatingPromo: promoQuery.isFetching,
  };
}
