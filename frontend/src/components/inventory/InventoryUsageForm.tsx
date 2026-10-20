"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button, Field, Input, Select } from "@/src/components/ui";
import { inventoryApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import type { InventoryItem } from "@/src/types";

export function InventoryUsageForm({
  items,
  onDone,
}: {
  items: InventoryItem[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState([{ item: "", quantity: "" }]);
  const [order, setOrder] = useState("");
  const [batch, setBatch] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      inventoryApi.logInventoryUsage({
        lines: lines.map((line) => ({
          item: Number(line.item),
          quantity: Number(line.quantity),
        })),
        order: order ? Number(order) : null,
        batch: batch.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onDone();
    },
  });

  const valid = lines.length > 0 && lines.every((line) => line.item && Number(line.quantity) > 0);

  return (
    <form
      className="border-y border-crease bg-steam/35 px-4 py-4 sm:px-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) mutation.mutate();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">Log supplies used</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Record several products from one wash load.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setLines((current) => [...current, { item: "", quantity: "" }])}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add line
        </Button>
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_2rem] items-end gap-2">
            <Field label={index === 0 ? "Supply" : "Supply"} htmlFor={`usage-item-${index}`}>
              <Select
                id={`usage-item-${index}`}
                value={line.item}
                onChange={(event) =>
                  setLines((current) => current.map((entry, i) =>
                    i === index ? { ...entry, item: event.target.value } : entry,
                  ))
                }
              >
                <option value="">Choose item</option>
                {items.filter((item) => item.is_active).map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</option>
                ))}
              </Select>
            </Field>
            <Field label={index === 0 ? "Quantity" : "Quantity"} htmlFor={`usage-quantity-${index}`}>
              <Input
                id={`usage-quantity-${index}`}
                type="number"
                min="0.01"
                step="0.01"
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) => current.map((entry, i) =>
                    i === index ? { ...entry, quantity: event.target.value } : entry,
                  ))
                }
              />
            </Field>
            <button
              type="button"
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-white hover:text-status-cancelled-text disabled:opacity-40"
              disabled={lines.length === 1}
              onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
              aria-label={`Remove usage line ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Order number" htmlFor="usage-order" hint="Optional">
          <Input id="usage-order" type="number" min="1" value={order} onChange={(e) => setOrder(e.target.value)} />
        </Field>
        <Field label="Load reference" htmlFor="usage-batch" hint="Optional">
          <Input id="usage-batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. LOAD-024" />
        </Field>
      </div>

      {mutation.error && <p className="mb-3 text-xs text-status-cancelled-text">{getApiErrorMessage(mutation.error)}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Recording…" : "Record usage"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
