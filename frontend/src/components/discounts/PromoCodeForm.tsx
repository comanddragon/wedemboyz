"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { DiscountType, PromoCode } from "@/src/types";

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
  const { t } = useI18n();
  const [code, setCode] = useState(promoCode?.code ?? "");
  const [description, setDescription] = useState(promoCode?.description ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    promoCode?.discount_type ?? "PERCENTAGE",
  );
  const [value, setValue] = useState(promoCode?.value ?? "");
  const [minOrderAmount, setMinOrderAmount] = useState(
    promoCode?.min_order_amount ?? "0",
  );
  const [maxUses, setMaxUses] = useState(
    promoCode?.max_uses != null ? String(promoCode.max_uses) : "",
  );
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(
    promoCode?.max_uses_per_user != null
      ? String(promoCode.max_uses_per_user)
      : "1",
  );
  const [validFrom, setValidFrom] = useState(
    promoCode?.valid_from ?? todayInputValue(),
  );
  const [validUntil, setValidUntil] = useState(
    promoCode?.valid_until ?? todayInputValue(),
  );

  const discountTypeOptions: { value: DiscountType; label: string }[] = [
    { value: "PERCENTAGE", label: t("adminDiscounts.percentageOff") },
    { value: "FIXED", label: t("adminDiscounts.fixedOff") },
  ];

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discount_type: discountType,
        value: Number(value),
        min_order_amount:
          minOrderAmount.trim() === "" ? undefined : Number(minOrderAmount),
        max_uses: maxUses.trim() === "" ? null : Number(maxUses),
        max_uses_per_user:
          maxUsesPerUser.trim() === "" ? undefined : Number(maxUsesPerUser),
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
        queryClient.setQueryData(
          queryKeys.discounts.promoCodes.detail(saved.id),
          saved,
        );
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
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field
          label={t("adminDiscounts.colCode")}
          htmlFor="promo-code"
          hint={t("adminDiscounts.codeHint")}
        >
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("adminDiscounts.codePlaceholder")}
            className="uppercase"
          />
        </Field>
        <Field label={t("adminDiscounts.discountType")} htmlFor="promo-type">
          <Select
            id="promo-type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
          >
            {discountTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field
          label={
            discountType === "PERCENTAGE"
              ? t("adminDiscounts.valuePercent")
              : t("adminDiscounts.valueAmount")
          }
          htmlFor="promo-value"
        >
          <Input
            id="promo-value"
            type="number"
            min="0"
            step={discountType === "PERCENTAGE" ? "1" : "50"}
            placeholder={
              discountType === "PERCENTAGE"
                ? t("adminDiscounts.valuePercentPlaceholder")
                : t("adminDiscounts.valueAmountPlaceholder")
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label={t("adminDiscounts.minOrderAmount")} htmlFor="promo-min-order">
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

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field
          label={t("adminDiscounts.maxUsesOptional")}
          htmlFor="promo-max-uses"
          hint={t("adminDiscounts.unlimitedHint")}
        >
          <Input
            id="promo-max-uses"
            type="number"
            min="1"
            placeholder={t("adminDiscounts.unlimited")}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </Field>
        <Field label={t("adminDiscounts.maxUsesPerCustomer")} htmlFor="promo-max-uses-per-user">
          <Input
            id="promo-max-uses-per-user"
            type="number"
            min="1"
            value={maxUsesPerUser}
            onChange={(e) => setMaxUsesPerUser(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("adminDiscounts.validFrom")} htmlFor="promo-valid-from">
          <Input
            id="promo-valid-from"
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </Field>
        <Field
          label={t("adminDiscounts.validUntil")}
          htmlFor="promo-valid-until"
          error={
            validUntil && validFrom && validUntil < validFrom
              ? t("adminDiscounts.validUntilError")
              : undefined
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

      <Field label={t("adminDiscounts.descriptionOptional")} htmlFor="promo-description">
        <Textarea
          id="promo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("adminDiscounts.promoDescPlaceholder")}
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
            ? t("adminDiscounts.saving")
            : promoCode
              ? t("adminDiscounts.saveChanges")
              : t("adminDiscounts.createCode")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("adminDiscounts.cancel")}
        </Button>
      </div>
    </form>
  );
}
