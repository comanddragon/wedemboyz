"use client";
import { buttonStyles } from "@/src/components/ui/Button";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck, HandCoins, Truck } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useState } from "react";

import {
  OrderSuccess,
  type CompletedBooking,
} from "@/src/components/booking/OrderSuccess";
import { BookingShell } from "@/src/components/booking/BookingShell";
import { Button, Card, Field, Input } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { useBooking } from "@/src/hooks/useBooking";
import { ordersApi, profileApi, scheduleApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { ensureSession } from "@/src/lib/guest-session";
import type { PaymentOption } from "@/src/lib/stores/booking.store";
import { ownerWhatsAppOrderUrl } from "@/src/lib/whatsapp-order";

import { bookingValidationError } from "@/src/lib/booking-validation";
import { useI18n } from "@/src/i18n/I18nProvider";

const PAYMENT_OPTIONS: Array<{
  value: PaymentOption;
  title: string;
  description: string;
  icon: typeof HandCoins;
}> = [
  {
    value: "PAY_AT_PICKUP",
    title: "booking.confirm.payOnPickup",
    description: "booking.confirm.payOnPickupBody",
    icon: HandCoins,
  },
  {
    value: "PAY_AFTER_DELIVERY",
    title: "booking.confirm.payOnDelivery",
    description: "booking.confirm.payOnDeliveryBody",
    icon: Truck,
  },
];

export default function BookConfirmPage() {
  const booking = useBooking();
  const { t } = useI18n();
  const { isAuthenticated, isGuest, user } = useAuth();
  const needsContact = !isAuthenticated || isGuest;
  const [completedBooking, setCompletedBooking] =
    useState<CompletedBooking | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const contactPhoneValid = /^\+?[\d ]{9,18}$/.test(contactPhone.trim());
  const missingContact =
    needsContact && (!contactName.trim() || !contactPhoneValid);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const errorKey = bookingValidationError(booking);
      if (errorKey) throw new Error(t(errorKey));
      if (missingContact || contactName.trim().length > 100)
        throw new Error(t("booking.requiredContact"));
      await ensureSession();
      if (needsContact) {
        await profileApi.updateProfile({
          first_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
        });
      }

      const order = await ordersApi.createOrder({
        fulfillment_type:
          booking.orderType === "pickup" ? "PICKUP" : "DROP_OFF",
        payment_option: booking.paymentOption,
        is_express: booking.isExpress,
        pickup_address:
          booking.orderType === "pickup"
            ? booking.pickupAddress.trim()
            : t("booking.dropoff"),
        delivery_address: booking.deliveryAddress.trim(),
        notes: booking.notes,
        items: booking.items.map(
          ({
            service_type,
            label,
            description,
            weight_kg,
            quantity,
            photos,
            photoPreviewUrls,
          }) => ({
            service_type,
            label,
            description,
            weight_kg,
            quantity,
            photos,
            photoPreviewUrls,
          }),
        ),
        promo_code: booking.promoCode ?? undefined,
      });

      if (
        booking.orderType === "pickup" &&
        booking.scheduledPickupDate &&
        booking.scheduledPickupSlot
      ) {
        await scheduleApi.createSchedule({
          order: order.id,
          pickup_date: booking.scheduledPickupDate,
          pickup_time_slot: booking.scheduledPickupSlot as never,
          delivery_date: booking.scheduledPickupDate,
          delivery_time_slot: booking.scheduledPickupSlot as never,
        });
      }
      return order;
    },
    onSuccess: (order) => {
      const whatsappUrl = ownerWhatsAppOrderUrl(order, {
        customerName: needsContact
          ? contactName
          : [user?.first_name, user?.last_name].filter(Boolean).join(" "),
        customerPhone: needsContact ? contactPhone : user?.phone_number,
        pickupDate: booking.scheduledPickupDate,
        pickupSlot: booking.scheduledPickupSlot,
      });
      setCompletedBooking({
        order,
        whatsappUrl,
        pickupDate: booking.scheduledPickupDate,
        pickupSlot: booking.scheduledPickupSlot,
      });
      booking.reset();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
  });

  if (completedBooking) return <OrderSuccess {...completedBooking} />;

  return (
    <BookingShell
      step={4}
      subtitle="booking.confirm.step4"
      actions={
        <Link
          href="/book/review"
          className={buttonStyles({ variant: "ghost" })}
        >
          {t("booking.back")}
        </Link>
      }
    >
      <Card className="grid items-start gap-x-12 gap-y-6 lg:grid-cols-[1.2fr_1fr] lg:p-7">
        <div>
          <p className="mb-5 text-sm text-ink-muted">
            {t("booking.total")}:{" "}
            <span className="text-base font-semibold text-navy">
              {booking.hasPendingWeight
                ? t("booking.confirm.afterWeighing")
                : formatCurrency(booking.total)}
            </span>
          </p>

          {needsContact ? (
            <div className="mb-6">
              <p className="mb-1 text-sm font-medium text-ink">
                {t("booking.confirm.contactDetails")}
              </p>
              <p className="mb-3 text-xs text-ink-muted">
                {t("booking.confirm.contactBody")}
              </p>
              <Field label={t("booking.confirm.yourName")} htmlFor="booking-contact-name">
                <Input
                  type="text"
                  required
                  maxLength={100}
                  id="booking-contact-name"
                  autoComplete="name"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder={t("booking.confirm.namePlaceholder")}
                />
              </Field>
              <Field label={t("booking.confirm.phoneNumber")} htmlFor="booking-contact-phone">
                <Input
                  type="tel"
                  required
                  pattern="[+]?[0-9 ]{9,18}"
                  maxLength={19}
                  id="booking-contact-phone"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder={t("booking.confirm.phonePlaceholder")}
                />
              </Field>
            </div>
          ) : null}

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium text-ink">
              {t("booking.paymentStep")}
            </legend>
            {PAYMENT_OPTIONS.map(
              ({ value, title, description, icon: Icon }) => {
                const selected = booking.paymentOption === value;
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${selected ? "border-status-ready-text/40 bg-status-ready-bg ring-[3px] ring-status-ready-text/15" : "border-crease hover:border-navy/40 hover:bg-steam/60"}`}
                  >
                    <input
                      type="radio"
                      name="payment-option"
                      value={value}
                      checked={selected}
                      onChange={() => booking.setPaymentOption(value)}
                      className="sr-only"
                    />
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-navy text-gold" : "bg-steam text-navy"}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">
                        {t(title)}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                        {t(description)}
                      </span>
                    </span>
                    {selected ? (
                      <CircleCheck
                        className="mt-2 h-4 w-4 shrink-0 text-status-ready-text"
                        aria-hidden="true"
                      />
                    ) : null}
                  </label>
                );
              },
            )}
          </fieldset>
        </div>

        <div className="lg:border-l lg:border-crease lg:pl-12">
          <h2 className="font-display text-base font-semibold text-navy">
            {t("booking.confirm.ready")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {t("booking.confirm.noPaymentNow")}
          </p>
          {errorMessage ? (
            <p role="alert" className="mt-4 text-sm text-status-cancelled-text">
              {errorMessage}
            </p>
          ) : null}
          <Button
            onClick={() => {
              setErrorMessage(null);
              submitMutation.mutate();
            }}
            disabled={
              submitMutation.isPending ||
              booking.items.length === 0 ||
              missingContact
            }
            className="mt-6 w-full"
          >
            {t(submitMutation.isPending ? "booking.confirm.placingOrder" : "booking.confirm.placeOrder")}
          </Button>
        </div>
      </Card>
    </BookingShell>
  );
}
