"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { PromoCodeForm } from "@/components/discounts/PromoCodeForm";
import { Button, Card, StatusBadge, type StatusTone } from "@/components/ui";
import { discountsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query-keys";
import type { PromoCode } from "@/types";

/** Same derivation as the list page — is_active, the validity window, and usage. */
function promoCodeStatus(promo: PromoCode): { label: string; tone: StatusTone } {
  if (!promo.is_active) return { label: "Paused", tone: "cancelled" };
  if (promo.max_uses != null && promo.times_used >= promo.max_uses) {
    return { label: "Exhausted", tone: "cancelled" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (today < promo.valid_from) return { label: "Scheduled", tone: "pending" };
  if (today > promo.valid_until) return { label: "Expired", tone: "cancelled" };
  return { label: "Active", tone: "ready" };
}

function formatDiscountValue(promo: PromoCode): string {
  return promo.discount_type === "PERCENTAGE" ? `${Number(promo.value)}%` : `${Number(promo.value)} XAF`;
}

export default function AdminPromoCodeDetailPage() {
  const params = useParams<{ id: string }>();
  const promoCodeId = Number(params.id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: promo, isLoading, error } = useQuery({
    queryKey: queryKeys.discounts.promoCodes.detail(promoCodeId),
    queryFn: () => discountsApi.getPromoCode(promoCodeId),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (is_active: boolean) => discountsApi.updatePromoCode(promoCodeId, { is_active }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.discounts.promoCodes.detail(promoCodeId), updated);
      queryClient.invalidateQueries({ queryKey: ["discounts", "promo-codes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => discountsApi.deletePromoCode(promoCodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts", "promo-codes"] });
      router.push("/admin/discounts/codes");
    },
    onError: (err) => setDeleteError(getApiErrorMessage(err)),
  });

  function handleDelete() {
    if (window.confirm(`Delete code "${promo?.code}"? This can't be undone.`)) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return <main className="mx-auto max-w-2xl px-6 py-10 text-sm text-ink-muted">Loading...</main>;
  }

  if (error || !promo) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/admin/discounts/codes"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to promo codes
        </Link>
        <p className="text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>
      </main>
    );
  }

  const status = promoCodeStatus(promo);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/admin/discounts/codes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to promo codes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-navy">{promo.code}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            Min. order {Number(promo.min_order_amount)} XAF
          </p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <Card className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-navy">{formatDiscountValue(promo)}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {new Date(promo.valid_from).toLocaleDateString()} – {new Date(promo.valid_until).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => toggleActiveMutation.mutate(!promo.is_active)}
            disabled={toggleActiveMutation.isPending}
          >
            {promo.is_active ? (
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
        <div className="mt-3 flex items-center gap-4 border-t border-crease pt-3 text-sm text-ink-muted">
          <span>
            Used {promo.times_used}
            {promo.max_uses != null ? ` / ${promo.max_uses} times` : " times (unlimited)"}
          </span>
          <span>Max {promo.max_uses_per_user} per customer</span>
        </div>
        {promo.description && <p className="mt-3 text-sm text-ink-muted">{promo.description}</p>}
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
          {deleteMutation.isPending ? "Deleting…" : "Delete code"}
        </Button>
      </div>

      {deleteError && <p className="mb-4 text-sm text-status-cancelled-text">{deleteError}</p>}

      {showEditForm && (
        <div className="mb-6">
          <PromoCodeForm promoCode={promo} onDone={() => setShowEditForm(false)} />
        </div>
      )}
    </main>
  );
}
