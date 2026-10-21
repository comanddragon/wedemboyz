"use client";

import Link from "next/link";
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
      subtitle="Step 2 — when and where?"
      actions={
        <div className="flex items-center justify-between">
          <Link href="/book">
            <Button variant="ghost">Back</Button>
          </Link>
          <Link href="/book/review" onClick={handleContinue}>
            <Button>Next: Review</Button>
          </Link>
        </div>
      }
    >
      <Card className="grid grid-cols-1 gap-x-5 md:grid-cols-6 lg:p-6">
        <div className="md:col-span-2">
          <Field label="Order type">
            <Select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
            >
              {ORDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {orderType === "pickup" ? (
          <div className="md:col-span-3">
            <Field label="Pick-up address">
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
            Bring your items to our Simbock shop. We&apos;ll use the delivery
            address below when they are ready.
          </div>
        )}

        <div className="md:col-span-3">
          <Field label="Delivery address">
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
          <Field label="Pickup date">
            <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Time slot">
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
          <Field label="Notes">
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
