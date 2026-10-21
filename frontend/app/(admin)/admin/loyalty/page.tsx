"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Coins, Gift, Plus, Save, Sparkles } from "lucide-react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Field, Input } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";

const TIER_STYLES = [
  { surface: "bg-bronze-50", text: "text-bronze", icon: Award },
  { surface: "bg-silver-50", text: "text-silver-600", icon: Sparkles },
  { surface: "bg-gold-50", text: "text-gold-600", icon: Gift },
];

export default function LoyaltySettingsPage() {
  const queryClient = useQueryClient();
  const tiers = useQuery({ queryKey: ["loyalty", "admin", "tiers"], queryFn: discountsApi.listLoyaltyTiers });
  const rules = useQuery({ queryKey: ["loyalty", "admin", "rules"], queryFn: discountsApi.listLoyaltyRules });
  const stamps = useQuery({ queryKey: ["loyalty", "admin", "stamps"], queryFn: discountsApi.listStampCardConfigs });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["loyalty", "admin"] });
  const tierMutation = useMutation({ mutationFn: ({ id, input }: { id: number; input: Parameters<typeof discountsApi.updateLoyaltyTier>[1] }) => discountsApi.updateLoyaltyTier(id, input), onSuccess: refresh });
  const ruleMutation = useMutation({ mutationFn: discountsApi.createLoyaltyRule, onSuccess: refresh });
  const stampMutation = useMutation({ mutationFn: discountsApi.createStampCardConfig, onSuccess: refresh });
  const error = tiers.error || rules.error || stamps.error || tierMutation.error || ruleMutation.error || stampMutation.error;
  const activeStamp = stamps.data?.results.find((item) => item.is_active) ?? stamps.data?.results[0];

  return <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Loyalty programme" description="Control how customers earn, progress, and come back—without making rewards hard to understand." />
    {error ? <p className="mb-5 rounded-xl bg-status-cancelled-bg px-4 py-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p> : null}

    <section className="mb-7 grid overflow-hidden rounded-2xl bg-navy text-white lg:grid-cols-[1.35fr_1fr_1fr]" aria-label="Loyalty overview">
      <div className="p-6 sm:p-7"><p className="max-w-xl font-display text-2xl font-semibold leading-tight">A clear reward path customers can understand at a glance.</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">Points drive everyday progress, tiers recognise long-term value, and stamps create a simple repeat-visit goal.</p></div>
      <div className="border-t border-white/10 p-6 lg:border-l lg:border-t-0"><Coins className="mb-3 h-5 w-5 text-gold" aria-hidden="true" /><p className="text-xs text-white/60">Active earning rules</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{rules.data?.results.filter((rule) => rule.is_active).length ?? "—"}</p></div>
      <div className="border-t border-white/10 p-6 lg:border-l lg:border-t-0"><Gift className="mb-3 h-5 w-5 text-gold" aria-hidden="true" /><p className="text-xs text-white/60">Current stamp reward</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{activeStamp ? `${activeStamp.stamps_required} stamps` : "Not set"}</p></div>
    </section>

    <section className="mb-8">
      <div className="mb-4"><h2 className="font-display text-xl font-semibold text-navy">Customer tiers</h2><p className="mt-1 text-sm text-ink-muted">Each step should feel meaningfully better than the last.</p></div>
      <div className="grid gap-4 lg:grid-cols-3">{tiers.isLoading ? [0,1,2].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-steam" />) : tiers.data?.map((tier, index) => {
        const style = TIER_STYLES[index % TIER_STYLES.length]; const Icon = style.icon;
        return <form key={tier.id} className="overflow-hidden rounded-2xl border border-crease bg-white" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); tierMutation.mutate({ id: tier.id, input: { minimum_lifetime_points: Number(data.get("threshold")), discount_percent: String(data.get("discount")), bonus_points_percent: String(data.get("bonus")), priority_service: data.get("priority") === "on" } }); }}>
          <div className={`${style.surface} flex items-center justify-between px-5 py-4`}><div><p className="text-xs font-medium text-ink-muted">Tier {index + 1}</p><h3 className={`font-display text-xl font-semibold capitalize ${style.text}`}>{tier.tier.toLowerCase()}</h3></div><Icon className={`h-6 w-6 ${style.text}`} aria-hidden="true" /></div>
          <div className="p-5"><Field label="Starts at lifetime points" htmlFor={`threshold-${tier.id}`}><Input id={`threshold-${tier.id}`} name="threshold" type="number" min="0" defaultValue={tier.minimum_lifetime_points} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Reward discount" htmlFor={`discount-${tier.id}`}><Input id={`discount-${tier.id}`} name="discount" type="number" min="0" max="100" step="0.01" defaultValue={tier.discount_percent} /></Field><Field label="Bonus points" htmlFor={`bonus-${tier.id}`}><Input id={`bonus-${tier.id}`} name="bonus" type="number" min="0" max="100" step="0.01" defaultValue={tier.bonus_points_percent} /></Field></div><div className="mt-1 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="priority" defaultChecked={tier.priority_service} className="h-4 w-4 accent-navy" />Priority service</label><Button size="sm" type="submit" disabled={tierMutation.isPending}><Save className="h-3.5 w-3.5" aria-hidden="true" />Save</Button></div></div>
        </form>;
      })}</div>
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-2xl border border-crease bg-white">
        <div className="border-b border-crease px-5 py-4"><h2 className="font-display text-lg font-semibold text-navy">Points earning</h2><p className="mt-1 text-sm text-ink-muted">When several rules qualify, the highest minimum-spend rule applies.</p></div>
        <div className="divide-y divide-crease">{rules.data?.results.map((rule) => <div key={rule.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4"><span className={`grid h-8 w-8 place-items-center rounded-full ${rule.is_active ? "bg-status-complete-bg text-status-complete-text" : "bg-steam text-ink-muted"}`}><Check className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-navy">{rule.name}</p><p className="text-xs text-ink-muted">Applies from {formatCurrency(rule.min_spend)}</p></div><p className="text-right font-display text-lg font-semibold tabular-nums text-navy">{rule.points_per_currency_unit}<span className="block font-sans text-[11px] font-normal text-ink-muted">points / XAF</span></p></div>)}</div>
        <form className="grid gap-3 border-t border-crease bg-steam/30 p-5 sm:grid-cols-[1fr_130px_140px_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); ruleMutation.mutate({ name: String(data.get("name")), points_per_currency_unit: String(data.get("rate")), min_spend: String(data.get("minimum")), is_active: true }); event.currentTarget.reset(); }}><Field label="New rule" htmlFor="rule-name"><Input id="rule-name" name="name" placeholder="e.g. Standard earn" required /></Field><Field label="Points / XAF" htmlFor="rule-rate"><Input id="rule-rate" name="rate" type="number" min="0" step="0.0001" required /></Field><Field label="Minimum spend" htmlFor="rule-min"><Input id="rule-min" name="minimum" type="number" min="0" defaultValue="0" /></Field><Button size="sm" type="submit"><Plus className="h-3.5 w-3.5" aria-hidden="true" />Add</Button></form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-crease bg-white">
        <div className="bg-gold-50 px-5 py-5"><Gift className="mb-3 h-5 w-5 text-gold-600" aria-hidden="true" /><h2 className="font-display text-lg font-semibold text-navy">Stamp card</h2><p className="mt-1 text-sm text-ink-muted">A simple, visible target for repeat customers.</p></div>
        <div className="p-5">{activeStamp ? <div className="mb-5 flex gap-2" aria-label={`${activeStamp.stamps_required} stamps required`}>{Array.from({ length: Math.min(activeStamp.stamps_required, 10) }, (_, index) => <span key={index} className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-gold-50 text-xs font-semibold text-gold-600">{index + 1}</span>)}</div> : <p className="mb-5 text-sm text-ink-muted">No stamp card is active yet.</p>}<form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); stampMutation.mutate({ points_per_stamp: Number(data.get("points")), stamps_required: Number(data.get("stamps")), is_active: true }); }}><Field label="Points per stamp" htmlFor="stamp-points"><Input id="stamp-points" name="points" type="number" min="1" defaultValue={activeStamp?.points_per_stamp} required /></Field><Field label="Stamps for reward" htmlFor="stamp-count"><Input id="stamp-count" name="stamps" type="number" min="1" defaultValue={activeStamp?.stamps_required} required /></Field><Button className="sm:col-span-2" type="submit" disabled={stampMutation.isPending}>{stampMutation.isPending ? "Activating…" : "Activate this card"}</Button></form></div>
      </section>
    </div>
  </main>;
}
