"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { WizardSteps } from "@/components/booking/WizardSteps";
import { Button, Card, CreaseDivider, Field, Input, Select, ServiceIcon, Textarea, serviceLabel } from "@/components/ui";
import { useBooking } from "@/hooks/useBooking";
import type { ServiceType } from "@/types";

const SERVICE_TYPES: ServiceType[] = [
  "VESTE", "TSHIRT", "CHEMISE", "PANTALON", "PULL", "ROBE", "ENSEMBLE",
  "DRAPS_COMPLET", "COUETTE_1P", "COUETTE_2P", "COUETTE_3P",
  "LAVAGE_ESSORAGE", "LAVAGE_SECHAGE", "REPASSAGE_PLASTIF",
];

export default function BookServicesPage() {
  const { items, addItem, removeItem, subtotal } = useBooking();

  const [serviceType, setServiceType] = useState<ServiceType>("TSHIRT");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [quantity, setQuantity] = useState("1");

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    addItem({
      service_type: serviceType,
      label,
      description,
      weight_kg: Number(weightKg),
      quantity: Number(quantity) || 1,
    });
    setLabel("");
    setDescription("");
    setWeightKg("1");
    setQuantity("1");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display mb-1 text-xl font-semibold text-navy">Book a pickup</h1>
      <p className="mb-6 text-sm text-ink-muted">Step 1 — what needs cleaning?</p>
      <WizardSteps current={1} />

      <Card>
        <form onSubmit={handleAddItem}>
          <Field label="Service">
            <Select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {serviceLabel(type)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Item label">
            <Input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Navy suit jacket"
            />
          </Field>

          <Field label="Description (optional)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Small coffee stain on left sleeve, please pre-treat"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Weight (kg)">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </Field>
            <Field label="Quantity">
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
          </div>

          <Button type="submit" variant="secondary" className="w-full">
            Add item
          </Button>
        </form>
      </Card>

      <CreaseDivider />

      <h2 className="font-display mb-3 text-sm font-medium text-ink">Items ({items.length})</h2>
      {items.length === 0 && <p className="text-sm text-ink-muted">No items added yet.</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.clientId}>
            <Card className="flex items-start gap-3 p-4">
              <span className="mt-0.5 text-navy">
                <ServiceIcon type={item.service_type} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{item.label || serviceLabel(item.service_type)}</p>
                <p className="text-xs text-ink-muted">
                  {serviceLabel(item.service_type)} — {item.weight_kg}kg x{item.quantity ?? 1}
                </p>
                {item.description && <p className="mt-1 text-xs text-ink-muted">{item.description}</p>}
              </div>
              <button
                onClick={() => removeItem(item.clientId)}
                aria-label="Remove item"
                className="text-ink-muted hover:text-status-cancelled-text"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-ink-muted">Estimated subtotal: {subtotal} XAF</p>

      <div className="mt-8 flex justify-between">
        <Link href="/dashboard">
          <Button variant="ghost">Back</Button>
        </Link>
        {items.length > 0 && (
          <Link href="/book/schedule">
            <Button>Next: Schedule</Button>
          </Link>
        )}
      </div>
    </main>
  );
}
