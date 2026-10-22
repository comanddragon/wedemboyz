"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, Field, Input, Select, Textarea } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type {
  DiscountCampaign,
  DiscountCampaignSegment,
  DiscountType,
} from "@/src/types";

/** YYYY-MM-DD for a date input's value, defaulting to today. */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create or edit a staff-managed promo campaign's business rules (name,
 * discount, target segment, date range). `is_active` is toggled separately
 * from the detail page once a campaign exists, so it's not part of this form.
 */
export function DiscountCampaignForm({
  campaign,
  onDone,
}: {
  /** Omit to create a new campaign; pass an existing one to edit it. */
  campaign?: DiscountCampaign;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    campaign?.discount_type ?? "PERCENTAGE",
  );
  const [value, setValue] = useState(campaign?.value ?? "");
  const [segment, setSegment] = useState<DiscountCampaignSegment>(
    campaign?.target_segment ?? "ALL",
  );
  const [startDate, setStartDate] = useState(
    campaign?.start_date ?? todayInputValue(),
  );
  const [endDate, setEndDate] = useState(
    campaign?.end_date ?? todayInputValue(),
  );

  const discountTypeOptions: { value: DiscountType; label: string }[] = [
    { value: "PERCENTAGE", label: t("adminDiscounts.percentageOff") },
    { value: "FIXED", label: t("adminDiscounts.fixedOff") },
  ];

  const segmentOptions: { value: DiscountCampaignSegment; label: string }[] = [
    { value: "ALL", label: t("adminDiscounts.segments.ALL") },
    { value: "NEW_CUSTOMERS", label: t("adminDiscounts.segments.NEW_CUSTOMERS") },
    { value: "LAPSED", label: t("adminDiscounts.segments.LAPSED") },
    { value: "LOYALTY_GOLD", label: t("adminDiscounts.goldLoyalty") },
  ];

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        description: description.trim() || undefined,
        discount_type: discountType,
        value: Number(value),
        target_segment: segment,
        start_date: startDate,
        end_date: endDate,
      };
      return campaign
        ? discountsApi.updateDiscountCampaign(campaign.id, input)
        : discountsApi.createDiscountCampaign(input);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "campaigns"] });
      if (campaign) {
        queryClient.setQueryData(
          queryKeys.discounts.campaigns.detail(saved.id),
          saved,
        );
      }
      onDone();
    },
  });

  const isValid =
    name.trim() !== "" &&
    value.trim() !== "" &&
    !Number.isNaN(Number(value)) &&
    startDate !== "" &&
    endDate !== "" &&
    endDate >= startDate;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) saveMutation.mutate();
      }}
      className="rounded-card border border-crease bg-steam/40 p-4"
    >
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("adminDiscounts.campaignName")} htmlFor="campaign-name">
          <Input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adminDiscounts.campaignNamePlaceholder")}
          />
        </Field>
        <Field label={t("adminDiscounts.targetSegment")} htmlFor="campaign-segment">
          <Select
            id="campaign-segment"
            value={segment}
            onChange={(e) =>
              setSegment(e.target.value as DiscountCampaignSegment)
            }
          >
            {segmentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("adminDiscounts.discountType")} htmlFor="campaign-type">
          <Select
            id="campaign-type"
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
        <Field
          label={
            discountType === "PERCENTAGE"
              ? t("adminDiscounts.valuePercent")
              : t("adminDiscounts.valueAmount")
          }
          htmlFor="campaign-value"
        >
          <Input
            id="campaign-value"
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
      </div>

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("adminDiscounts.startDate")} htmlFor="campaign-start">
          <Input
            id="campaign-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field
          label={t("adminDiscounts.endDate")}
          htmlFor="campaign-end"
          error={
            endDate && startDate && endDate < startDate
              ? t("adminDiscounts.endDateError")
              : undefined
          }
        >
          <Input
            id="campaign-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <Field
        label={t("adminDiscounts.descriptionOptional")}
        htmlFor="campaign-description"
      >
        <Textarea
          id="campaign-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("adminDiscounts.campaignDescPlaceholder")}
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
            : campaign
              ? t("adminDiscounts.saveChanges")
              : t("adminDiscounts.createCampaign")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("adminDiscounts.cancel")}
        </Button>
      </div>
    </form>
  );
}
