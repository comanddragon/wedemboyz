"use client";

import Link from "next/link";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useBooking } from "@/hooks/useBooking";
import type { OrderType } from "@/lib/stores/booking.store";
import type { TimeSlot } from "@/types";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
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
  const [slot, setSlot] = useState<TimeSlot>((scheduledPickupSlot as TimeSlot) ?? "MORNING");

  function handleContinue() {
    setSchedule({ date, slot });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display mb-1 text-xl font-semibold text-navy">Book a pickup</h1>
      <p className="mb-6 text-sm text-ink-muted">Step 2 — when and where?</p>
      <WizardSteps current={2} />

      <Card>
        <Field label="Order type">
          <Select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}>
            {ORDER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Pickup address">
          <Input
            type="text"
            value={pickupAddress}
            onChange={(e) => setAddresses({ pickupAddress: e.target.value })}
          />
        </Field>

        <Field label="Delivery address">
          <Input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setAddresses({ deliveryAddress: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Pickup date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time slot">
            <Select value={slot} onChange={(e) => setSlot(e.target.value as TimeSlot)}>
              {TIME_SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>

      <div className="mt-8 flex justify-between">
        <Link href="/book">
          <Button variant="ghost">Back</Button>
        </Link>
        <Link href="/book/review" onClick={handleContinue}>
          <Button>Next: Review</Button>
        </Link>
      </div>
    </main>
  );
}
