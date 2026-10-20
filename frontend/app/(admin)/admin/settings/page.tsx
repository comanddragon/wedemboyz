"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Plus, Save, Tag } from "lucide-react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Card, Field, Input, Select, Textarea } from "@/src/components/ui";
import { staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";

const SERVICE_TYPES = [
  ["VESTE", "Jacket"], ["TSHIRT", "T-shirt"], ["CHEMISE", "Shirt"],
  ["PANTALON", "Trousers"], ["PULL", "Pullover"], ["ROBE", "Dress"],
  ["ENSEMBLE", "Outfit"], ["DRAPS_COMPLET", "Complete bedsheet"],
  ["COUETTE_1P", "Duvet 1 place"], ["COUETTE_2P", "Duvet 2 places"],
  ["COUETTE_3P", "Duvet 3 places"], ["LAVAGE_ESSORAGE", "Wash + spin"],
  ["LAVAGE_SECHAGE", "Wash + dry"], ["REPASSAGE_PLASTIF", "Iron + wrap"],
] as const;

const CHANNELS = ["sms", "email", "whatsapp"] as const;

function parseKeyValues(value: FormDataEntryValue | null) {
  const result: Record<string, string> = {};
  String(value ?? "").split("\n").forEach((line) => {
    const separator = line.indexOf("=");
    if (separator < 1) return;
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  });
  return result;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["staff", "settings"], queryFn: staffApi.getBusinessSettings });
  const prices = useQuery({ queryKey: ["staff", "settings", "prices"], queryFn: () => staffApi.listPriceItems() });
  const plans = useQuery({ queryKey: ["staff", "settings", "plans"], queryFn: staffApi.listSubscriptionPlanSettings });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff", "settings"] });
  const saveSettings = useMutation({ mutationFn: staffApi.updateBusinessSettings, onSuccess: refresh });
  const addPrice = useMutation({ mutationFn: staffApi.createPriceItem, onSuccess: refresh });
  const togglePrice = useMutation({ mutationFn: ({ id, active }: { id: number; active: boolean }) => staffApi.updatePriceItem(id, { is_active: active }), onSuccess: refresh });
  const savePlan = useMutation({ mutationFn: ({ id, input }: { id?: number; input: Parameters<typeof staffApi.createSubscriptionPlanSetting>[0] }) => id ? staffApi.updateSubscriptionPlanSetting(id, input) : staffApi.createSubscriptionPlanSetting(input), onSuccess: refresh });
  const error = settings.error || prices.error || plans.error || saveSettings.error || addPrice.error || togglePrice.error || savePlan.error;

  if (settings.isLoading) return <main className="p-5 text-sm text-ink-muted">Loading settings…</main>;
  const current = settings.data;
  if (!current) return <main className="p-5 text-sm text-status-cancelled-text">Unable to load business settings.</main>;

  return <main className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Business settings" description="Manage company details, fulfilment rules, price history, plans, and customer notifications." />
    {error ? <p className="mb-4 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p> : null}

    <form key={current.id} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const channelSettings = Object.fromEntries(CHANNELS.map((channel) => [channel, data.get(`channel-${channel}`) === "on"]));
      saveSettings.mutate({
        business_name: String(data.get("business_name")), address: String(data.get("address")),
        phone: String(data.get("phone")), tax_number: String(data.get("tax_number")),
        receipt_footer: String(data.get("receipt_footer")), delivery_fee_flat: String(data.get("delivery_fee_flat")),
        free_delivery_threshold: String(data.get("free_delivery_threshold")) || null,
        tax_rate_percent: String(data.get("tax_rate_percent")), subscription_period_days: Number(data.get("subscription_period_days")),
        operating_hours: parseKeyValues(data.get("operating_hours")),
        closed_days: String(data.get("closed_days")).split(",").map((day) => day.trim()).filter(Boolean),
        slot_capacities: Object.fromEntries(Object.entries(parseKeyValues(data.get("slot_capacities"))).map(([key, value]) => [key, Number(value)])),
        notification_channels: channelSettings,
        notification_templates: { ...current.notification_templates, order_ready: String(data.get("template_order_ready")), order_delivered: String(data.get("template_order_delivered")) },
      });
    }}>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-gold" /><h2 className="text-sm font-semibold text-navy">Business & billing</h2></div>
          <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Business name" htmlFor="business-name"><Input id="business-name" name="business_name" defaultValue={current.business_name} required /></Field>
            <Field label="Phone" htmlFor="business-phone"><Input id="business-phone" name="phone" defaultValue={current.phone} /></Field>
            <Field label="Tax number" htmlFor="tax-number"><Input id="tax-number" name="tax_number" defaultValue={current.tax_number} /></Field>
            <Field label="Tax rate %" htmlFor="tax-rate"><Input id="tax-rate" name="tax_rate_percent" type="number" min="0" max="100" step="0.01" defaultValue={current.tax_rate_percent} /></Field>
            <div className="sm:col-span-2"><Field label="Address" htmlFor="business-address"><Input id="business-address" name="address" defaultValue={current.address} /></Field></div>
            <Field label="Delivery fee (XAF)" htmlFor="delivery-fee"><Input id="delivery-fee" name="delivery_fee_flat" type="number" min="0" defaultValue={current.delivery_fee_flat} /></Field>
            <Field label="Free delivery from" htmlFor="free-delivery"><Input id="free-delivery" name="free_delivery_threshold" type="number" min="0" defaultValue={current.free_delivery_threshold ?? ""} /></Field>
            <div className="sm:col-span-2"><Field label="Receipt footer" htmlFor="receipt-footer"><Textarea id="receipt-footer" name="receipt_footer" className="min-h-20" defaultValue={current.receipt_footer} /></Field></div>
            <Field label="Subscription days" htmlFor="subscription-days"><Input id="subscription-days" name="subscription_period_days" type="number" min="1" defaultValue={current.subscription_period_days} /></Field>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2"><Bell className="h-4 w-4 text-gold" /><h2 className="text-sm font-semibold text-navy">Notifications</h2></div>
          <div className="mb-4 flex flex-wrap gap-3">{CHANNELS.map((channel) => <label key={channel} className="flex items-center gap-2 text-xs font-medium capitalize"><input type="checkbox" name={`channel-${channel}`} defaultChecked={current.notification_channels[channel] ?? channel === "sms"} />{channel}</label>)}</div>
          <Field label="Ready message" htmlFor="ready-template"><Textarea id="ready-template" name="template_order_ready" className="min-h-16" defaultValue={current.notification_templates.order_ready ?? "Your order is ready for collection."} /></Field>
          <Field label="Delivered message" htmlFor="delivered-template"><Textarea id="delivered-template" name="template_order_delivered" className="min-h-16" defaultValue={current.notification_templates.order_delivered ?? "Your order has been delivered. Thank you."} /></Field>
        </Card>
      </div>
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy">Hours & booking capacity</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Operating hours (day=time)" htmlFor="operating-hours"><Textarea id="operating-hours" name="operating_hours" className="min-h-24 font-mono text-xs" defaultValue={Object.entries(current.operating_hours).map(([key, value]) => `${key}=${value}`).join("\n")} /></Field>
          <Field label="Closed days (comma-separated)" htmlFor="closed-days"><Textarea id="closed-days" name="closed_days" className="min-h-24 text-xs" defaultValue={current.closed_days.join(", ")} /></Field>
          <Field label="Slot capacity (slot=count)" htmlFor="slot-capacity"><Textarea id="slot-capacity" name="slot_capacities" className="min-h-24 font-mono text-xs" defaultValue={Object.entries(current.slot_capacities).map(([key, value]) => `${key}=${value}`).join("\n")} /></Field>
        </div>
        <div className="flex justify-end"><Button size="sm" type="submit" disabled={saveSettings.isPending}><Save className="h-3.5 w-3.5" />Save settings</Button></div>
      </Card>
    </form>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-gold" /><h2 className="text-sm font-semibold text-navy">Price history</h2></div>
        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_110px_100px_110px_auto] lg:items-end" onSubmit={(event) => {
          event.preventDefault(); const data = new FormData(event.currentTarget); const service = String(data.get("service_type"));
          addPrice.mutate({ service_type: service, label: SERVICE_TYPES.find(([value]) => value === service)?.[1] ?? service, unit_mode: String(data.get("unit_mode")) as "PIECE" | "KILOGRAM", price: String(data.get("price")), minimum_charge: String(data.get("minimum_charge")), effective_from: String(data.get("effective_from")), effective_until: null, is_active: true });
          event.currentTarget.reset();
        }}>
          <Field label="Service" htmlFor="price-service"><Select id="price-service" name="service_type" defaultValue="VESTE">{SERVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <Field label="Mode" htmlFor="price-mode"><Select id="price-mode" name="unit_mode" defaultValue="PIECE"><option value="PIECE">Per piece</option><option value="KILOGRAM">Per kilogram</option></Select></Field>
          <Field label="Price" htmlFor="price-value"><Input id="price-value" name="price" type="number" min="0" required /></Field>
          <Field label="Minimum" htmlFor="price-minimum"><Input id="price-minimum" name="minimum_charge" type="number" min="0" defaultValue="0" /></Field>
          <Field label="Effective" htmlFor="price-effective"><Input id="price-effective" name="effective_from" type="date" required /></Field>
          <Button size="sm" type="submit" aria-label="Add price"><Plus className="h-3.5 w-3.5" /></Button>
        </form>
        <div className="mt-2 divide-y divide-crease">{prices.data?.results.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-xs"><div><p className="font-semibold text-ink">{item.label}</p><p className="text-ink-muted">{item.unit_mode === "KILOGRAM" ? "per kg" : "per piece"} · from {item.effective_from}</p></div><span className="font-semibold tabular-nums text-navy">{Number(item.price).toLocaleString()} XAF</span><Button size="sm" variant="ghost" onClick={() => togglePrice.mutate({ id: item.id, active: !item.is_active })}>{item.is_active ? "Disable" : "Enable"}</Button></div>)}</div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy">Subscription plans</h2>
        <div className="space-y-3">{plans.data?.map((plan) => <form key={plan.id} className="grid grid-cols-[1fr_100px_80px_auto] items-end gap-2" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); savePlan.mutate({ id: plan.id, input: { plan: plan.plan, label: String(data.get("label")), price: String(data.get("price")), kilos: String(data.get("kilos")), is_active: data.get("active") === "on" } }); }}>
          <Field label={plan.plan} htmlFor={`plan-label-${plan.id}`}><Input id={`plan-label-${plan.id}`} name="label" defaultValue={plan.label} /></Field><Field label="Price" htmlFor={`plan-price-${plan.id}`}><Input id={`plan-price-${plan.id}`} name="price" type="number" min="0" defaultValue={plan.price} /></Field><Field label="Kg" htmlFor={`plan-kilos-${plan.id}`}><Input id={`plan-kilos-${plan.id}`} name="kilos" type="number" min="0" step="0.01" defaultValue={plan.kilos} /></Field><div className="mb-4 flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={plan.is_active} aria-label={`${plan.label} active`} /><Button size="sm" type="submit" aria-label={`Save ${plan.label}`}><Save className="h-3.5 w-3.5" /></Button></div>
        </form>)}</div>
        <form className="mt-3 grid grid-cols-2 gap-2 border-t border-crease pt-3" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); savePlan.mutate({ input: { plan: String(data.get("plan")).toUpperCase(), label: String(data.get("label")), price: String(data.get("price")), kilos: String(data.get("kilos")), is_active: true } }); event.currentTarget.reset(); }}>
          <Field label="Plan code" htmlFor="new-plan-code"><Input id="new-plan-code" name="plan" required /></Field><Field label="Label" htmlFor="new-plan-label"><Input id="new-plan-label" name="label" required /></Field><Field label="Price" htmlFor="new-plan-price"><Input id="new-plan-price" name="price" type="number" min="0" required /></Field><Field label="Kilograms" htmlFor="new-plan-kilos"><Input id="new-plan-kilos" name="kilos" type="number" min="0" step="0.01" required /></Field><Button size="sm" type="submit" className="col-span-2"><Plus className="h-3.5 w-3.5" />Add plan</Button>
        </form>
      </Card>
    </div>
  </main>;
}
