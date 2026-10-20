"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, Save } from "lucide-react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Card, Field, Input } from "@/src/components/ui";
import { discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";

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

  return <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Loyalty" description="Set how customers earn points, progress through tiers, and complete a stamp card." />
    {error ? <p className="mb-4 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p> : null}
    <section>
      <h2 className="mb-3 text-sm font-semibold text-navy">Tier thresholds & benefits</h2>
      <div className="grid gap-3 lg:grid-cols-3">{tiers.data?.map((tier) => <form key={tier.id} className="rounded-xl border border-crease bg-white p-4" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        tierMutation.mutate({ id: tier.id, input: { minimum_lifetime_points: Number(data.get("threshold")), discount_percent: String(data.get("discount")), bonus_points_percent: String(data.get("bonus")), priority_service: data.get("priority") === "on" } });
      }}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-display font-semibold text-navy">{tier.tier}</h3><Award className="h-4 w-4 text-gold" /></div>
        <Field label="Starts at lifetime points" htmlFor={`threshold-${tier.id}`}><Input id={`threshold-${tier.id}`} name="threshold" type="number" min="0" defaultValue={tier.minimum_lifetime_points} /></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Discount %" htmlFor={`discount-${tier.id}`}><Input id={`discount-${tier.id}`} name="discount" type="number" min="0" max="100" step="0.01" defaultValue={tier.discount_percent} /></Field><Field label="Bonus points %" htmlFor={`bonus-${tier.id}`}><Input id={`bonus-${tier.id}`} name="bonus" type="number" min="0" max="100" step="0.01" defaultValue={tier.bonus_points_percent} /></Field></div>
        <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" name="priority" defaultChecked={tier.priority_service} /> Priority service</label><Button size="sm" type="submit" aria-label={`Save ${tier.tier} tier`}><Save className="h-3.5 w-3.5" /></Button></div>
      </form>)}</div>
    </section>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-navy">Points rules</h2><p className="mb-4 text-xs text-ink-muted">The highest eligible minimum-spend rule applies.</p>
        <div className="mb-4 divide-y divide-crease">{rules.data?.results.map((rule) => <div key={rule.id} className="flex justify-between py-2 text-sm"><span>{rule.name}</span><span className="tabular-nums text-ink-muted">{rule.points_per_currency_unit} pts/XAF · from {rule.min_spend}</span></div>)}</div>
        <form className="grid gap-2 sm:grid-cols-[1fr_120px_120px_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); ruleMutation.mutate({ name: String(data.get("name")), points_per_currency_unit: String(data.get("rate")), min_spend: String(data.get("minimum")), is_active: true }); event.currentTarget.reset(); }}>
          <Field label="Rule name" htmlFor="rule-name"><Input id="rule-name" name="name" required /></Field><Field label="Points/XAF" htmlFor="rule-rate"><Input id="rule-rate" name="rate" type="number" min="0" step="0.0001" required /></Field><Field label="Min spend" htmlFor="rule-min"><Input id="rule-min" name="minimum" type="number" min="0" defaultValue="0" /></Field><Button size="sm" type="submit" aria-label="Add points rule"><Plus className="h-3.5 w-3.5" /></Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-navy">Stamp card</h2><p className="mb-4 text-xs text-ink-muted">Creating a new active configuration makes it the live card.</p>
        {stamps.data?.results[0] ? <p className="mb-4 text-sm">Current: <strong>{stamps.data.results[0].stamps_required} stamps</strong> at <strong>{stamps.data.results[0].points_per_stamp} points</strong> each.</p> : null}
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); stampMutation.mutate({ points_per_stamp: Number(data.get("points")), stamps_required: Number(data.get("stamps")), is_active: true }); }}>
          <Field label="Points per stamp" htmlFor="stamp-points"><Input id="stamp-points" name="points" type="number" min="1" required /></Field><Field label="Stamps per reward" htmlFor="stamp-count"><Input id="stamp-count" name="stamps" type="number" min="1" required /></Field><Button size="sm" type="submit">Activate</Button>
        </form>
      </Card>
    </div>
  </main>;
}
