"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Gift, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Field, Input, Select } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function LoyaltySettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rewardTrack, setRewardTrack] = useState<"CREDIT" | "BADGE">("CREDIT");
  const isOwner = Boolean(user?.is_superuser);
  const settings = useQuery({
    queryKey: ["loyalty", "admin", "settings"],
    queryFn: discountsApi.getLoyaltyProgramSettings,
    enabled: isOwner,
  });
  const rewards = useQuery({
    queryKey: ["loyalty", "admin", "rewards"],
    queryFn: discountsApi.listLoyaltyRewards,
    enabled: isOwner,
  });
  const settingsMutation = useMutation({
    mutationFn: discountsApi.updateLoyaltyProgramSettings,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["loyalty", "admin", "settings"],
      }),
  });
  const rewardMutation = useMutation({
    mutationFn: discountsApi.createLoyaltyReward,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["loyalty", "admin", "rewards"],
      }),
  });
  const rewardToggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      discountsApi.updateLoyaltyReward(id, { is_active }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["loyalty", "admin", "rewards"],
      }),
  });
  const error =
    settings.error ||
    rewards.error ||
    settingsMutation.error ||
    rewardMutation.error ||
    rewardToggleMutation.error;

  if (!isOwner)
    return (
      <main className="grid min-h-64 place-items-center p-8 text-sm text-ink-muted">
        {t("adminPrograms.ownerOnlyLoyalty")}
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminPrograms.loyalty")}
        description={t("adminPrograms.loyaltyBody")}
      />
      {error ? (
        <p className="mb-5 rounded-xl bg-status-cancelled-bg px-4 py-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      ) : null}

      <section className="mb-7 grid overflow-hidden rounded-2xl bg-navy text-white sm:grid-cols-2">
        <div className="p-6 sm:p-7">
          <Coins className="h-5 w-5 text-gold" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            {t("adminPrograms.creditRewards")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {t("adminPrograms.creditRewardsBody")}
          </p>
        </div>
        <div className="border-t border-white/10 p-6 sm:border-l sm:border-t-0 sm:p-7">
          <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-semibold">
            {t("adminPrograms.badgeTiers")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {t("adminPrograms.badgeTiersBody")}
          </p>
        </div>
      </section>

      {settings.data ? (
        <section
          className="mb-7 overflow-hidden rounded-2xl border border-crease bg-white"
          aria-labelledby="programme-controls-title"
        >
          <div className="border-b border-crease px-5 py-4">
            <h2
              id="programme-controls-title"
              className="font-display text-lg font-semibold text-navy"
            >
              {t("adminPrograms.controls")}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t("adminPrograms.controlsBody")}
            </p>
          </div>
          <div className="grid gap-px bg-crease sm:grid-cols-2">
            {(
              [
                [
                  "credit_points_enabled",
                  t("adminPrograms.creditRewards"),
                  t("adminPrograms.awardCredits"),
                ],
                [
                  "badge_tiers_enabled",
                  t("adminPrograms.badgeTiers"),
                  t("adminPrograms.awardBadges"),
                ],
              ] as const
            ).map(([key, label, description]) => {
              const enabled = settings.data[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-5 bg-white p-5"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">{label}</p>
                    <p className="mt-1 text-xs text-ink-muted">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${enabled ? t("adminPrograms.disable") : t("adminPrograms.enable")} ${label}`}
                    onClick={() => settingsMutation.mutate({ [key]: !enabled })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-navy" : "bg-crease-strong"}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl border border-crease bg-white"
        aria-labelledby="rewards-title"
      >
        <div className="border-b border-crease px-5 py-4">
          <h2
            id="rewards-title"
            className="font-display text-lg font-semibold text-navy"
          >
            {t("adminPrograms.catalogue")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t("adminPrograms.catalogueBody")}
          </p>
        </div>
        {rewards.data?.length ? (
          <div className="divide-y divide-crease">
            {rewards.data.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-50 text-gold-600">
                    <Gift className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy">
                        {reward.name}
                      </p>
                      <span className="rounded-full bg-steam px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
                        {reward.track}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {reward.description || t("adminPrograms.noDescription")}
                      {reward.track === "CREDIT"
                        ? ` · ${reward.points_cost.toLocaleString()} ${t("adminPrograms.credits")}`
                        : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    rewardToggleMutation.mutate({
                      id: reward.id,
                      is_active: !reward.is_active,
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${reward.is_active ? "bg-status-ready-bg text-status-ready-text" : "bg-steam text-ink-muted"}`}
                >
                  {reward.is_active ? t("adminPrograms.active") : t("adminPrograms.paused")}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-ink-muted">
            {t("adminPrograms.noRewards")}
          </div>
        )}
        <form
          className="grid gap-3 border-t border-crease bg-steam/30 p-5 sm:grid-cols-[1fr_1.5fr_150px_130px_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            rewardMutation.mutate({
              name: String(data.get("name")),
              description: String(data.get("description")),
              track: rewardTrack,
              points_cost:
                rewardTrack === "CREDIT" ? Number(data.get("points_cost")) : 0,
              is_active: true,
            });
            event.currentTarget.reset();
          }}
        >
          <Field label={t("adminPrograms.rewardName")}>
            <Input name="name" required />
          </Field>
          <Field label={t("adminPrograms.description")}>
            <Input name="description" />
          </Field>
          <Field label={t("adminPrograms.programme")}>
            <Select
              name="track"
              value={rewardTrack}
              onChange={(event) =>
                setRewardTrack(event.target.value as "CREDIT" | "BADGE")
              }
            >
              <option value="CREDIT">{t("adminPrograms.credit")}</option>
              <option value="BADGE">{t("adminPrograms.badgeCard")}</option>
            </Select>
          </Field>
          <Field label={t("adminPrograms.creditCost")}>
            <Input
              name="points_cost"
              type="number"
              min="1"
              disabled={rewardTrack === "BADGE"}
              required={rewardTrack === "CREDIT"}
            />
          </Field>
          <Button type="submit" size="sm" disabled={rewardMutation.isPending}>
            <Plus className="h-3.5 w-3.5" />
            {t("adminPrograms.addReward")}
          </Button>
        </form>
      </section>
    </main>
  );
}
