"use client";

import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useState } from "react";

import { BookingShell } from "@/src/components/booking/BookingShell";
import {
  Button,
  Card,
  DateInput,
  Field,
  Input,
  Select,
  Textarea,
} from "@/src/components/ui";
import { useBooking } from "@/src/hooks/useBooking";
import type { OrderType } from "@/src/lib/stores/booking.store";
import type { TimeSlot } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "pickup", label: "Pick up" },
  { value: "drop-off", label: "Drop-off in store" },
];
const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: "MORNING", label: "8:00 - 11:00" },
  { value: "MIDDAY", label: "11:00 - 14:00" },
  { value: "AFTERNOON", label: "14:00 - 17:00" },
  { value: "EVENING", label: "17:00 - 19:00" },
];

export default function BookSchedulePage() {
  const { t } = useI18n();
  const {
    orderType,
    setOrderType,
    pickupAddress,
    deliveryAddress,
    setAddresses,
    scheduledPickupDate,
    scheduledPickupSlot,
    setSchedule,
    notes,
    setNotes,
  } = useBooking();

  const [date, setDate] = useState(scheduledPickupDate ?? "");
  const [slot, setSlot] = useState<TimeSlot>(
    (scheduledPickupSlot as TimeSlot) ?? "MORNING",
  );

  function handleContinue() {
    if (orderType === "drop-off") {
      setAddresses({ pickupAddress: "In-store drop-off" });
    }
    setSchedule({ date, slot });
  }

  return (
    <BookingShell
      step={2}
      subtitle="booking.step2"
      actions={
        <div className="flex items-center justify-between">
          <Link href="/book">
            <Button variant="ghost">{t("booking.back")}</Button>
          </Link>
          <Link href="/book/review" onClick={handleContinue}>
            <Button>{t("booking.nextReview")}</Button>
          </Link>
        </div>
      }
    >
      <Card className="grid grid-cols-1 gap-x-5 md:grid-cols-6 lg:p-6">
        <div className="md:col-span-2">
          <Field label={t("booking.orderType")}>
            <Select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
            >
              {ORDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.value === "pickup" ? t("booking.pickup") : t("booking.dropoff")}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {orderType === "pickup" ? (
          <div className="md:col-span-3">
            <Field label={t("booking.pickupAddress")}>
              <Input
                type="text"
                value={pickupAddress}
                onChange={(e) =>
                  setAddresses({ pickupAddress: e.target.value })
                }
              />
            </Field>
          </div>
        ) : (
          <div className="md:col-span-3 rounded-xl bg-steam/60 px-4 py-3 text-sm text-ink-soft">
            {t("booking.shopHelp")}
          </div>
        )}

        <div className="md:col-span-3">
          <Field label={t("booking.deliveryAddress")}>
            <Input
              type="text"
              value={deliveryAddress}
              onChange={(e) =>
                setAddresses({ deliveryAddress: e.target.value })
              }
            />
          </Field>
        </div>

        <div className="min-w-0 md:col-span-2">
          <Field label={t("booking.pickupDate")}>
            <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label={t("booking.timeSlot")}>
            <Select
              value={slot}
              onChange={(e) => setSlot(e.target.value as TimeSlot)}
            >
              {TIME_SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="md:col-span-6">
          <Field label={t("booking.notes")}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
      </Card>
    </BookingShell>
  );
}
