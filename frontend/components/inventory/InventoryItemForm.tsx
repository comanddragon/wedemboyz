"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { inventoryApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryCategory, InventoryItem, InventoryUnit } from "@/types";

const CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: "DETERGENT", label: "Detergent" },
  { value: "SOFTENER", label: "Softener" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "L", label: "Liters (L)" },
  { value: "ML", label: "Milliliters (mL)" },
  { value: "KG", label: "Kilograms (kg)" },
  { value: "PCS", label: "Pieces (pcs)" },
];

/**
 * Create or edit an inventory item's fixed attributes (name, category, unit,
 * low-stock threshold, notes). `quantity` is never set here — stock only
 * changes through a logged transaction (see InventoryAdjustForm).
 */
export function InventoryItemForm({
  item,
  onDone,
}: {
  /** Omit to create a new item; pass an existing item to edit it. */
  item?: InventoryItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<InventoryCategory>(item?.category ?? "DETERGENT");
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? "L");
  const [threshold, setThreshold] = useState(item?.low_stock_threshold ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        category,
        unit,
        low_stock_threshold: threshold.trim() === "" ? undefined : Number(threshold),
        notes: notes.trim() || undefined,
      };
      return item ? inventoryApi.updateInventoryItem(item.id, input) : inventoryApi.createInventoryItem(input);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      if (item) {
        queryClient.setQueryData(queryKeys.inventory.items.detail(saved.id), saved);
      }
      onDone();
    },
  });

  const isValid = name.trim() !== "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) saveMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="inv-name">
          <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Liquid detergent" />
        </Field>
        <Field label="Category" htmlFor="inv-category">
          <Select id="inv-category" value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)}>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Unit" htmlFor="inv-unit">
          <Select id="inv-unit" value={unit} onChange={(e) => setUnit(e.target.value as InventoryUnit)}>
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Low-stock threshold" htmlFor="inv-threshold" hint="Alert when quantity falls to or below this.">
          <Input
            id="inv-threshold"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 5"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="inv-notes">
        <Textarea id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {saveMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(saveMutation.error)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : item ? "Save changes" : "Add item"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
