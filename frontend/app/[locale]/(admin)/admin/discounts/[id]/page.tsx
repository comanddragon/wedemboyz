"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DiscountCampaignForm } from "@/src/components/discounts/DiscountCampaignForm";
import {
  Button,
  Card,
  StatusBadge,
  type StatusTone,
} from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { DiscountCampaign, DiscountCampaignSegment } from "@/src/types";

function formatDiscountValue(campaign: DiscountCampaign): string {
  return campaign.discount_type === "PERCENTAGE"
    ? `${Number(campaign.value)}%`
    : formatCurrency(campaign.value);
}

export default function AdminDiscountDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const segmentLabels: Record<DiscountCampaignSegment, string> = {
    ALL: t("adminDiscounts.segments.ALL"),
    NEW_CUSTOMERS: t("adminDiscounts.segments.NEW_CUSTOMERS"),
    LAPSED: t("adminDiscounts.segments.LAPSED"),
    LOYALTY_GOLD: t("adminDiscounts.segments.LOYALTY_GOLD"),
  };

  function getCampaignStatus(campaign: DiscountCampaign): {
    label: string;
    tone: StatusTone;
  } {
    if (!campaign.is_active)
      return { label: t("adminDiscounts.pausedStatus"), tone: "cancelled" };
    const today = new Date().toISOString().slice(0, 10);
    if (today < campaign.start_date)
      return { label: t("adminDiscounts.scheduledStatus"), tone: "pending" };
    if (today > campaign.end_date)
      return { label: t("adminDiscounts.endedStatus"), tone: "cancelled" };
    return { label: t("adminDiscounts.activeStatus"), tone: "ready" };
  }

  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.discounts.campaigns.detail(campaignId),
    queryFn: () => discountsApi.getDiscountCampaign(campaignId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      discountsApi.updateDiscountCampaign(campaignId, { is_active }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.discounts.campaigns.detail(campaignId),
        updated,
      );
      queryClient.invalidateQueries({ queryKey: ["discounts", "campaigns"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => discountsApi.deleteDiscountCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "campaigns"] });
      router.push("/admin/discounts");
    },
    onError: (err) => setDeleteError(getApiErrorMessage(err)),
  });

  function handleDelete() {
    if (
      window.confirm(
        t("adminDiscounts.confirmDeleteCampaign").replace(
          "{name}",
          campaign?.name ?? "",
        ),
      )
    ) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        {t("common.loading")}
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href="/admin/discounts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("adminDiscounts.backToDiscounts")}
        </Link>
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  const status = getCampaignStatus(campaign);

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/discounts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminDiscounts.backToDiscounts")}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {campaign.name}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {segmentLabels[campaign.target_segment]}
          </p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-navy">
              {formatDiscountValue(campaign)}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {new Date(campaign.start_date).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-US",
              )}{" "}
              –{" "}
              {new Date(campaign.end_date).toLocaleDateString(
                locale === "fr" ? "fr-FR" : "en-US",
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => toggleActiveMutation.mutate(!campaign.is_active)}
            disabled={toggleActiveMutation.isPending}
          >
            {campaign.is_active ? (
              <>
                <Pause className="h-4 w-4" aria-hidden="true" />
                {t("adminDiscounts.pause")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                {t("adminDiscounts.resume")}
              </>
            )}
          </Button>
        </div>
        {campaign.description && (
          <p className="mt-3 border-t border-crease pt-3 text-sm text-ink-muted">
            {campaign.description}
          </p>
        )}
        {toggleActiveMutation.isError && (
          <p className="mt-3 text-sm text-status-cancelled-text">
            {getApiErrorMessage(toggleActiveMutation.error)}
          </p>
        )}
      </Card>

      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowEditForm((v) => !v)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {showEditForm
            ? t("adminDiscounts.close")
            : t("adminDiscounts.editDetails")}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {deleteMutation.isPending
            ? t("adminDiscounts.deleting")
            : t("adminDiscounts.deleteCampaign")}
        </Button>
      </div>

      {deleteError && (
        <p className="mb-4 text-sm text-status-cancelled-text">{deleteError}</p>
      )}

      {showEditForm && (
        <div className="mb-6">
          <DiscountCampaignForm
            campaign={campaign}
            onDone={() => setShowEditForm(false)}
          />
        </div>
      )}
    </main>
  );
}
