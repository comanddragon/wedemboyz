"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { inventoryApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { InventoryChangeType, InventoryItem } from "@/types";

const CHANGE_TYPE_OPTIONS: { value: InventoryChangeType; label: string; hint: string }[] = [
  { value: "RESTOCK", label: "Restock", hint: "Stock coming in — enter a positive amount." },
  { value: "USAGE", label: "Log usage", hint: "Stock used up — enter how much was used (recorded as a decrease)." },
  { value: "ADJUSTMENT", label: "Correct count", hint: "Stocktake correction — enter the amount to add or subtract." },
];

export function InventoryAdjustForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [changeType, setChangeType] = useState<InventoryChangeType>("RESTOCK");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const adjustMutation = useMutation({
    mutationFn: () => {
      const parsed = Number(amount);
      // USAGE is always a decrease — staff enter it as a plain positive
      // quantity ("used 2L"), so flip the sign before it hits the API,
      // which requires quantity_change < 0 for USAGE.
      const quantity_change = changeType === "USAGE" ? -Math.abs(parsed) : parsed;
      return inventoryApi.adjustInventoryItem(item.id, {
        change_type: changeType,
        quantity_change,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.inventory.items.detail(item.id), updated);
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.items.transactions(item.id) });
      setAmount("");
      setReason("");
      onDone();
    },
  });

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount !== 0;
  const activeOption = CHANGE_TYPE_OPTIONS.find((o) => o.value === changeType)!;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) adjustMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="adjust-type">
          <Select id="adjust-type" value={changeType} onChange={(e) => setChangeType(e.target.value as InventoryChangeType)}>
            {CHANGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Amount (${item.unit})`} htmlFor="adjust-amount" hint={activeOption.hint}>
          <Input
            id="adjust-amount"
            type="number"
            step="0.1"
            min={changeType === "ADJUSTMENT" ? undefined : "0.01"}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Reason (optional)" htmlFor="adjust-reason">
        <Textarea id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. delivery from Casino, or weekly stocktake" />
      </Field>

      {adjustMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(adjustMutation.error)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || adjustMutation.isPending}>
          {adjustMutation.isPending ? "Saving…" : "Record change"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
