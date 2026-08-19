"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Card, Field, Input, Select, ServiceIcon, serviceLabel } from "@/components/ui";
import { formatCurrency } from "@/lib/constants";
import type { QuickSaleItemInput, ServiceType } from "@/types";

const SERVICE_TYPES: ServiceType[] = [
  "VESTE",
  "TSHIRT",
  "CHEMISE",
  "PANTALON",
  "PULL",
  "ROBE",
  "ENSEMBLE",
  "DRAPS_COMPLET",
  "COUETTE_1P",
  "COUETTE_2P",
  "COUETTE_3P",
  "LAVAGE_ESSORAGE",
  "LAVAGE_SECHAGE",
  "REPASSAGE_PLASTIF",
];

export interface QuickSaleLineItem extends QuickSaleItemInput {
  /** Client-only key for list rendering/removal — never sent to the API. */
  clientId: string;
}

export function QuickSaleItems({
  items,
  onAdd,
  onRemove,
}: {
  items: QuickSaleLineItem[];
  onAdd: (item: QuickSaleLineItem) => void;
  onRemove: (clientId: string) => void;
}) {
  const [serviceType, setServiceType] = useState<ServiceType>("TSHIRT");
  const [label, setLabel] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [priceOverride, setPriceOverride] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    onAdd({
      clientId: crypto.randomUUID(),
      service_type: serviceType,
      label: label.trim() || undefined,
      weight_kg: Number(weightKg) || 1,
      quantity: Number(quantity) || 1,
      unit_price: priceOverride.trim() === "" ? null : Number(priceOverride),
    });
    setLabel("");
    setWeightKg("1");
    setQuantity("1");
    setPriceOverride("");
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="rounded-card border border-crease bg-steam/40 p-4">
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label="Service" htmlFor="qs-service">
            <Select id="qs-service" value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {serviceLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Item label (optional)" htmlFor="qs-label">
            <Input id="qs-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 3 shirts" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
          <Field label="Weight (kg)" htmlFor="qs-weight">
            <Input
              id="qs-weight"
              type="number"
              step="0.1"
              min="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </Field>
          <Field label="Quantity" htmlFor="qs-quantity">
            <Input id="qs-quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Price override (optional)" htmlFor="qs-price" hint="Leave blank to auto-price">
            <Input
              id="qs-price"
              type="number"
              min="0"
              step="1"
              placeholder="Auto"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" variant="secondary" className="w-full">
          Add item
        </Button>
      </form>

      <h2 className="mb-3 mt-6 text-sm font-medium text-ink">Items ({items.length})</h2>
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
                  {serviceLabel(item.service_type)} — {item.weight_kg ?? 1}kg x{item.quantity ?? 1}
                  {item.unit_price != null && <> — {formatCurrency(item.unit_price)} (manual)</>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.clientId)}
                aria-label="Remove item"
                className="text-ink-muted hover:text-status-cancelled-text"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
