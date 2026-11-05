"use client";
import { buttonStyles } from "@/src/components/ui/Button";

import { ensureSession } from "@/src/lib/guest-session";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { discountsApi } from "@/src/lib/api";

import { BookingShell } from "@/src/components/booking/BookingShell";
import {
  Card,
  CreaseDivider,
  Field,
  Select,
  ServiceIcon,
  serviceLabel,
} from "@/src/components/ui";
import { useBooking } from "@/src/hooks/useBooking";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function BookReviewPage() {
  const { t } = useI18n();
  const {
    items,
    hasPendingWeight,
    orderType,
    pickupAddress,
    deliveryAddress,
    scheduledPickupDate,
    scheduledPickupSlot,
    promoCode,
    setPromoCode,
    subtotal,
    deliveryFee,
    discount,
    total,
    isPromoValid,
    promoError,
    isValidatingPromo,
  } = useBooking();

  const availablePromos = useQuery({
    queryKey: ["booking", "available-promos"],
    queryFn: async () => {
      await ensureSession();
      const codes = [];
      let page = 1;
      while (true) {
        const result = await discountsApi.listPromoCodes({ available: true, page });
        codes.push(...result.results);
        if (!result.next) return codes;
        page += 1;
      }
    },
    retry: false,
  });

  return (
    <BookingShell
      step={3}
      subtitle="booking.step3"
      actions={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/book/schedule" className={buttonStyles({ variant: "ghost" })}>{t("booking.back")}</Link>
          <Link href="/book/confirm" className={buttonStyles({  })}>{t("booking.nextPayment")}</Link>
        </div>
      }
    >
      {hasPendingWeight && <p className="mb-4 text-sm text-ink-muted">{t("booking.kiloHelp")}</p>}
      <Card className="grid gap-x-12 gap-y-6 lg:grid-cols-[1.3fr_1fr] lg:p-7">
        <div>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            {t("booking.items")}
          </h2>
          <ul className="mb-4 space-y-2">
            {items.map((item) => (
              <li
                key={item.clientId}
                className="flex items-center gap-2 text-sm"
              >
                {item.photoPreviewUrls?.[0] ? (
                  <Image
                    src={item.photoPreviewUrls[0]}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-navy">
                    <ServiceIcon type={item.service_type} />
                  </span>
                )}
                <span>
                  {item.label || serviceLabel(item.service_type)} —{" "}
                  {["LAVAGE_ESSORAGE", "LAVAGE_SECHAGE", "REPASSAGE_PLASTIF"].includes(item.service_type)
                    ? item.weight_kg == null ? t("booking.weightPending") : `${item.weight_kg} kg`
                    : `× ${item.quantity ?? 1}`}
                </span>
              </li>
            ))}
          </ul>

          <CreaseDivider className="my-4" />

          <p className="text-sm text-ink-muted">
            {t("booking.orderType")}: {orderType === "pickup" ? t("booking.pickup") : t("booking.dropoff")}
          </p>
          {orderType === "pickup" ? (
            <p className="text-sm text-ink-muted">
              {t("booking.pickupAddress")}: {pickupAddress || `(${t("booking.notSet")})`}
            </p>
          ) : null}
          <p className="text-sm text-ink-muted">
            {t("booking.delivery")}: {deliveryAddress || `(${t("booking.notSet")})`}
          </p>
          <p className="mb-4 text-sm text-ink-muted">
            {t("booking.scheduled")}: {scheduledPickupDate || `(${t("booking.notSet")})`} —{" "}
            {scheduledPickupSlot || `(${t("booking.notSet")})`}
          </p>

          <Field label={t("booking.promo")} htmlFor="booking-promo">
            <Select
              id="booking-promo"
              value={promoCode ?? ""}
              onChange={(event) => setPromoCode(event.target.value || null)}
              disabled={availablePromos.isPending}
            >
              <option value="">{t("booking.noPromo")}</option>
              {availablePromos.data?.map((promo) => (
                <option key={promo.id} value={promo.code}>{promo.code}</option>
              ))}
            </Select>
          </Field>
          {availablePromos.isError && <p role="alert" className="text-xs text-status-cancelled-text">{t("booking.promoUnavailable")}</p>}
          {availablePromos.isSuccess && !availablePromos.data.length && <p className="text-xs text-ink-muted">{t("booking.promoEmpty")}</p>}
          {isValidatingPromo && (
            <p className="text-xs text-ink-muted">{t("booking.checkingPromo")}</p>
          )}
          {promoCode && isPromoValid && (
            <p className="text-xs text-status-ready-text">{t("booking.promoApplied")}</p>
          )}
          {promoCode && promoError && (
            <p className="text-xs text-status-cancelled-text">{promoError}</p>
          )}
        </div>

        <div className="lg:border-l lg:border-crease lg:pl-12">
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            {t("booking.summary")}
          </h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>{t("booking.subtotal")}</span>
              <span>{hasPendingWeight ? t("booking.weightPending") : formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("booking.deliveryFee")}</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("booking.discount")}</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>{t("booking.total")}</span>
              <span>{hasPendingWeight ? t("booking.pendingTotal") : formatCurrency(total)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {t("booking.serverPrice")}
          </p>
        </div>
      </Card>
    </BookingShell>
  );
}
