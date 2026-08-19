"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { DiscountCampaignForm } from "@/components/discounts/DiscountCampaignForm";
import { Button, Card, StatusBadge, type StatusTone } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { DiscountCampaign, DiscountCampaignSegment } from "@/types";

const SEGMENT_LABELS: Record<DiscountCampaignSegment, string> = {
  ALL: "All customers",
  NEW_CUSTOMERS: "New customers",
  LAPSED: "Lapsed customers",
  LOYALTY_GOLD: "Gold-tier loyalty",
};

/** Same derivation as the list page — is_active plus the date range. */
function campaignStatus(campaign: DiscountCampaign): { label: string; tone: StatusTone } {
  if (!campaign.is_active) return { label: "Paused", tone: "cancelled" };
  const today = new Date().toISOString().slice(0, 10);
  if (today < campaign.start_date) return { label: "Scheduled", tone: "pending" };
  if (today > campaign.end_date) return { label: "Ended", tone: "cancelled" };
  return { label: "Active", tone: "ready" };
}

function formatDiscountValue(campaign: DiscountCampaign): string {
  return campaign.discount_type === "PERCENTAGE" ? `${Number(campaign.value)}%` : `${Number(campaign.value)} XAF`;
}

export default function AdminDiscountDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.campaigns.detail(campaignId),
    queryFn: () => discountsApi.getDiscountCampaign(campaignId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (is_active: boolean) => discountsApi.updateDiscountCampaign(campaignId, { is_active }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.discounts.campaigns.detail(campaignId), updated);
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
    if (window.confirm(`Delete "${campaign?.name}"? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !campaign) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin/discounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to discounts
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const status = campaignStatus(campaign);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin/discounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to discounts
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{campaign.name}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">{SEGMENT_LABELS[campaign.target_segment]}</p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-navy">{formatDiscountValue(campaign)}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {new Date(campaign.start_date).toLocaleDateString()} – {new Date(campaign.end_date).toLocaleDateString()}
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
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Resume
              </>
            )}
          </Button>
        </div>
        {campaign.description && (
          <p className="mt-3 border-t border-crease pt-3 text-sm text-ink-muted">{campaign.description}</p>
        )}
        {toggleActiveMutation.isError && (
          <p className="mt-3 text-sm text-status-cancelled-text">{getApiErrorMessage(toggleActiveMutation.error)}</p>
        )}
      </Card>

      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" onClick={() => setShowEditForm((v) => !v)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {showEditForm ? "Close" : "Edit details"}
        </Button>
        <Button variant="ghost" onClick={handleDelete} disabled={deleteMutation.isPending}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {deleteMutation.isPending ? "Deleting…" : "Delete campaign"}
        </Button>
      </div>

      {deleteError && <p className="mb-4 text-sm text-status-cancelled-text">{deleteError}</p>}

      {showEditForm && (
        <div className="mb-6">
          <DiscountCampaignForm campaign={campaign} onDone={() => setShowEditForm(false)} />
        </div>
      )}
    </main>
  );
}
