"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { DiscountType, PromoCode } from "@/types";

const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "PERCENTAGE", label: "Percentage off" },
  { value: "FIXED", label: "Fixed amount off" },
];

/** YYYY-MM-DD for a date input's value, defaulting to today. */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create or edit a customer-redeemable promo code (the `code` a customer
 * types at checkout — distinct from a DiscountCampaign, which targets a
 * segment automatically and has no code of its own).
 */
export function PromoCodeForm({
  promoCode,
  onDone,
}: {
  /** Omit to create a new code; pass an existing one to edit it. */
  promoCode?: PromoCode;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(promoCode?.code ?? "");
  const [description, setDescription] = useState(promoCode?.description ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(promoCode?.discount_type ?? "PERCENTAGE");
  const [value, setValue] = useState(promoCode?.value ?? "");
  const [minOrderAmount, setMinOrderAmount] = useState(promoCode?.min_order_amount ?? "0");
  const [maxUses, setMaxUses] = useState(promoCode?.max_uses != null ? String(promoCode.max_uses) : "");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(
    promoCode?.max_uses_per_user != null ? String(promoCode.max_uses_per_user) : "1"
  );
  const [validFrom, setValidFrom] = useState(promoCode?.valid_from ?? todayInputValue());
  const [validUntil, setValidUntil] = useState(promoCode?.valid_until ?? todayInputValue());

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discount_type: discountType,
        value: Number(value),
        min_order_amount: minOrderAmount.trim() === "" ? undefined : Number(minOrderAmount),
        max_uses: maxUses.trim() === "" ? null : Number(maxUses),
        max_uses_per_user: maxUsesPerUser.trim() === "" ? undefined : Number(maxUsesPerUser),
        valid_from: validFrom,
        valid_until: validUntil,
      };
      return promoCode
        ? discountsApi.updatePromoCode(promoCode.id, input)
        : discountsApi.createPromoCode(input);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "promo-codes"] });
      if (promoCode) {
        queryClient.setQueryData(queryKeys.discounts.promoCodes.detail(saved.id), saved);
      }
      onDone();
    },
  });

  const isValid =
    code.trim() !== "" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value)) &&
    validFrom !== "" &&
    validUntil !== "" &&
    validUntil >= validFrom;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) saveMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="promo-code" hint="What the customer types at checkout.">
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. WELCOME10"
            className="uppercase"
          />
        </Field>
        <Field label="Discount type" htmlFor="promo-type">
          <Select
            id="promo-type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            {DISCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label={discountType === "PERCENTAGE" ? "Value (%)" : "Value (XAF)"} htmlFor="promo-value">
          <Input
            id="promo-value"
            type="number"
            min="0"
            step={discountType === "PERCENTAGE" ? "1" : "50"}
            placeholder={discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 1000"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Minimum order amount (XAF)" htmlFor="promo-min-order">
          <Input
            id="promo-min-order"
            type="number"
            min="0"
            step="50"
            placeholder="0"
            value={minOrderAmount}
            onChange={(e) => setMinOrderAmount(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Max total uses (optional)" htmlFor="promo-max-uses" hint="Leave blank for unlimited.">
          <Input
            id="promo-max-uses"
            type="number"
            min="1"
            placeholder="Unlimited"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </Field>
        <Field label="Max uses per customer" htmlFor="promo-max-uses-per-user">
          <Input
            id="promo-max-uses-per-user"
            type="number"
            min="1"
            value={maxUsesPerUser}
            onChange={(e) => setMaxUsesPerUser(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Field label="Valid from" htmlFor="promo-valid-from">
          <Input
            id="promo-valid-from"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </Field>
        <Field
          label="Valid until"
          htmlFor="promo-valid-until"
          error={
            validUntil && validFrom && validUntil < validFrom ? "Valid-until must be after valid-from." : undefined
          }
        >
          <Input
            id="promo-valid-until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Description (optional)" htmlFor="promo-description">
        <Textarea
          id="promo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Internal note about who this code is for or why it exists."
        />
      </Field>

      {saveMutation.isError && (
        <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(saveMutation.error)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : promoCode ? "Save changes" : "Create code"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
