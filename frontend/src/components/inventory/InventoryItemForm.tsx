"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/src/components/ui";
import { inventoryApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
} from "@/src/types";

const CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: "DETERGENT", label: "Detergent" },
  { value: "SOFTENER", label: "Softener" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "STAIN_REMOVER", label: "Stain remover" },
  { value: "BLEACH", label: "Bleach" },
  { value: "HANGERS", label: "Hangers" },
  { value: "BAGS", label: "Bags" },
  { value: "MACHINE_PARTS", label: "Machine parts" },
  { value: "CLEANING", label: "Cleaning supplies" },
  { value: "OTHER", label: "Other" },
];

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: "L", label: "Liters (L)" },
  { value: "ML", label: "Milliliters (mL)" },
  { value: "KG", label: "Kilograms (kg)" },
  { value: "PCS", label: "Pieces (pcs)" },
  { value: "G", label: "Grams (g)" },
  { value: "PACK", label: "Packs" },
  { value: "BOX", label: "Boxes" },
  { value: "ROLL", label: "Rolls" },
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
  const [category, setCategory] = useState<InventoryCategory>(
    item?.category ?? "DETERGENT",
  );
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? "L");
  const [threshold, setThreshold] = useState(item?.low_stock_threshold ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [unitCost, setUnitCost] = useState(item?.unit_cost ?? "");
  const [supplier, setSupplier] = useState(item?.supplier ? String(item.supplier) : "");
  const [reorderQuantity, setReorderQuantity] = useState(item?.reorder_quantity ?? "");
  const [location, setLocation] = useState(item?.storage_location ?? "");
  const [expiresOn, setExpiresOn] = useState(item?.expires_on ?? "");

  const suppliersQuery = useQuery({
    queryKey: ["inventory", "suppliers"],
    queryFn: inventoryApi.listSuppliers,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        category,
        unit,
        low_stock_threshold:
          threshold.trim() === "" ? undefined : Number(threshold),
        notes: notes.trim() || undefined,
        sku: sku.trim() || null,
        brand: brand.trim() || undefined,
        unit_cost: unitCost ? Number(unitCost) : undefined,
        supplier: supplier ? Number(supplier) : null,
        reorder_quantity: reorderQuantity ? Number(reorderQuantity) : undefined,
        storage_location: location.trim() || undefined,
        expiry_tracking: Boolean(expiresOn),
        expires_on: expiresOn || null,
      };
      return item
        ? inventoryApi.updateInventoryItem(item.id, input)
        : inventoryApi.createInventoryItem(input);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      if (item) {
        queryClient.setQueryData(
          queryKeys.inventory.items.detail(saved.id),
          saved,
        );
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
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Name" htmlFor="inv-name">
          <Input
            id="inv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Liquid detergent"
          />
        </Field>
        <Field label="Category" htmlFor="inv-category">
          <Select
            id="inv-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as InventoryCategory)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="SKU" htmlFor="inv-sku">
          <Input id="inv-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="Brand" htmlFor="inv-brand">
          <Input id="inv-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Supplier" htmlFor="inv-supplier">
          <Select id="inv-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            <option value="">No supplier</option>
            {suppliersQuery.data?.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Initial unit cost" htmlFor="inv-cost">
          <Input id="inv-cost" type="number" min="0" step="1" inputMode="numeric" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
        </Field>
        <Field label="Reorder quantity" htmlFor="inv-reorder">
          <Input id="inv-reorder" type="number" min="0" step="0.01" value={reorderQuantity} onChange={(e) => setReorderQuantity(e.target.value)} />
        </Field>
        <Field label="Storage location" htmlFor="inv-location">
          <Input id="inv-location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Expiry date" htmlFor="inv-expiry">
          <Input id="inv-expiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Unit" htmlFor="inv-unit">
          <Select
            id="inv-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as InventoryUnit)}
          >
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Low-stock threshold"
          htmlFor="inv-threshold"
          hint="Alert when quantity falls to or below this."
        >
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
        <Textarea
          id="inv-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {saveMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(saveMutation.error)}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving…"
            : item
              ? "Save changes"
              : "Add item"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
