"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Plus, Save, Tag } from "lucide-react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Card, Field, Input, Select, Textarea } from "@/src/components/ui";
import { staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

const SERVICE_CODES = [
  "VESTE",
  "TSHIRT",
  "CHEMISE",
  "PANTALON",
  "PULL",
  "ROBE",
  "ENSEMBLE",
  "DRAPS_COMPLET",
  "COUETTE_1P",
  "COUETTE_2P",
  "COUETTE_3P",
  "LAVAGE_ESSORAGE",
  "LAVAGE_SECHAGE",
  "REPASSAGE_PLASTIF",
] as const;

const CHANNELS = ["sms", "email", "whatsapp"] as const;

function parseKeyValues(value: FormDataEntryValue | null) {
  const result: Record<string, string> = {};
  String(value ?? "")
    .split("\n")
    .forEach((line) => {
      const separator = line.indexOf("=");
      if (separator < 1) return;
      result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    });
  return result;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const serviceLabels: Record<string, string> = {
    VESTE: t("adminSettings.services.VESTE"),
    TSHIRT: t("adminSettings.services.TSHIRT"),
    CHEMISE: t("adminSettings.services.CHEMISE"),
    PANTALON: t("adminSettings.services.PANTALON"),
    PULL: t("adminSettings.services.PULL"),
    ROBE: t("adminSettings.services.ROBE"),
    ENSEMBLE: t("adminSettings.services.ENSEMBLE"),
    DRAPS_COMPLET: t("adminSettings.services.DRAPS_COMPLET"),
    COUETTE_1P: t("adminSettings.services.COUETTE_1P"),
    COUETTE_2P: t("adminSettings.services.COUETTE_2P"),
    COUETTE_3P: t("adminSettings.services.COUETTE_3P"),
    LAVAGE_ESSORAGE: t("adminSettings.services.LAVAGE_ESSORAGE"),
    LAVAGE_SECHAGE: t("adminSettings.services.LAVAGE_SECHAGE"),
    REPASSAGE_PLASTIF: t("adminSettings.services.REPASSAGE_PLASTIF"),
  };

  const settings = useQuery({
    queryKey: ["staff", "settings"],
    queryFn: staffApi.getBusinessSettings,
  });
  const prices = useQuery({
    queryKey: ["staff", "settings", "prices"],
    queryFn: () => staffApi.listPriceItems(),
  });
  const plans = useQuery({
    queryKey: ["staff", "settings", "plans"],
    queryFn: staffApi.listSubscriptionPlanSettings,
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["staff", "settings"] });
  const saveSettings = useMutation({
    mutationFn: staffApi.updateBusinessSettings,
    onSuccess: refresh,
  });
  const addPrice = useMutation({
    mutationFn: staffApi.createPriceItem,
    onSuccess: refresh,
  });
  const togglePrice = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      staffApi.updatePriceItem(id, { is_active: active }),
    onSuccess: refresh,
  });
  const savePlan = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: number;
      input: Parameters<typeof staffApi.createSubscriptionPlanSetting>[0];
    }) =>
      id
        ? staffApi.updateSubscriptionPlanSetting(id, input)
        : staffApi.createSubscriptionPlanSetting(input),
    onSuccess: refresh,
  });
  const error =
    settings.error ||
    prices.error ||
    plans.error ||
    saveSettings.error ||
    addPrice.error ||
    togglePrice.error ||
    savePlan.error;

  if (settings.isLoading)
    return (
      <main className="p-5 text-sm text-ink-muted">
        {t("adminSettings.loadingSettings")}
      </main>
    );
  const current = settings.data;
  if (!current)
    return (
      <main className="p-5 text-sm text-status-cancelled-text">
        {t("adminSettings.errorLoading")}
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminSettings.title")}
        description={t("adminSettings.description")}
      />
      {error ? (
        <p className="mb-4 text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      ) : null}

      <form
        key={current.id}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const channelSettings = Object.fromEntries(
            CHANNELS.map((channel) => [
              channel,
              data.get(`channel-${channel}`) === "on",
            ]),
          );
          saveSettings.mutate({
            business_name: String(data.get("business_name")),
            address: String(data.get("address")),
            phone: String(data.get("phone")),
            tax_number: String(data.get("tax_number")),
            receipt_footer: String(data.get("receipt_footer")),
            delivery_fee_flat: String(data.get("delivery_fee_flat")),
            free_delivery_threshold:
              String(data.get("free_delivery_threshold")) || null,
            tax_rate_percent: String(data.get("tax_rate_percent")),
            subscription_period_days: Number(
              data.get("subscription_period_days"),
            ),
            operating_hours: parseKeyValues(data.get("operating_hours")),
            closed_days: String(data.get("closed_days"))
              .split(",")
              .map((day) => day.trim())
              .filter(Boolean),
            slot_capacities: Object.fromEntries(
              Object.entries(parseKeyValues(data.get("slot_capacities"))).map(
                ([key, value]) => [key, Number(value)],
              ),
            ),
            notification_channels: channelSettings,
            notification_templates: {
              ...current.notification_templates,
              order_ready: String(data.get("template_order_ready")),
              order_delivered: String(data.get("template_order_delivered")),
            },
          });
        }}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-4 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gold" />
              <h2 className="text-sm font-semibold text-navy">
                {t("adminSettings.businessBilling")}
              </h2>
            </div>
            <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label={t("adminSettings.businessName")}
                htmlFor="business-name"
              >
                <Input
                  id="business-name"
                  name="business_name"
                  defaultValue={current.business_name}
                  required
                />
              </Field>
              <Field label={t("adminSettings.phone")} htmlFor="business-phone">
                <Input
                  id="business-phone"
                  name="phone"
                  defaultValue={current.phone}
                />
              </Field>
              <Field
                label={t("adminSettings.taxNumber")}
                htmlFor="tax-number"
              >
                <Input
                  id="tax-number"
                  name="tax_number"
                  defaultValue={current.tax_number}
                />
              </Field>
              <Field label={t("adminSettings.taxRate")} htmlFor="tax-rate">
                <Input
                  id="tax-rate"
                  name="tax_rate_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={current.tax_rate_percent}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={t("adminSettings.address")}
                  htmlFor="business-address"
                >
                  <Input
                    id="business-address"
                    name="address"
                    defaultValue={current.address}
                  />
                </Field>
              </div>
              <Field
                label={t("adminSettings.deliveryFee")}
                htmlFor="delivery-fee"
              >
                <Input
                  id="delivery-fee"
                  name="delivery_fee_flat"
                  type="number"
                  min="0"
                  defaultValue={current.delivery_fee_flat}
                />
              </Field>
              <Field
                label={t("adminSettings.freeDeliveryFrom")}
                htmlFor="free-delivery"
              >
                <Input
                  id="free-delivery"
                  name="free_delivery_threshold"
                  type="number"
                  min="0"
                  defaultValue={current.free_delivery_threshold ?? ""}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={t("adminSettings.receiptFooter")}
                  htmlFor="receipt-footer"
                >
                  <Textarea
                    id="receipt-footer"
                    name="receipt_footer"
                    className="min-h-20"
                    defaultValue={current.receipt_footer}
                  />
                </Field>
              </div>
              <Field
                label={t("adminSettings.subscriptionDays")}
                htmlFor="subscription-days"
              >
                <Input
                  id="subscription-days"
                  name="subscription_period_days"
                  type="number"
                  min="1"
                  defaultValue={current.subscription_period_days}
                />
              </Field>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-gold" />
              <h2 className="text-sm font-semibold text-navy">
                {t("adminSettings.notifications")}
              </h2>
            </div>
            <div className="mb-4 flex flex-wrap gap-3">
              {CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex items-center gap-2 text-xs font-medium capitalize"
                >
                  <input
                    type="checkbox"
                    name={`channel-${channel}`}
                    defaultChecked={
                      current.notification_channels[channel] ??
                      channel === "sms"
                    }
                  />
                  {channel}
                </label>
              ))}
            </div>
            <Field
              label={t("adminSettings.readyMessage")}
              htmlFor="ready-template"
            >
              <Textarea
                id="ready-template"
                name="template_order_ready"
                className="min-h-16"
                defaultValue={
                  current.notification_templates.order_ready ??
                  "Your order is ready for collection."
                }
              />
            </Field>
            <Field
              label={t("adminSettings.deliveredMessage")}
              htmlFor="delivered-template"
            >
              <Textarea
                id="delivered-template"
                name="template_order_delivered"
                className="min-h-16"
                defaultValue={
                  current.notification_templates.order_delivered ??
                  "Your order has been delivered. Thank you."
                }
              />
            </Field>
          </Card>
        </div>
        <Card className="mt-4 p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">
            {t("adminSettings.hoursCapacity")}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label={t("adminSettings.operatingHours")}
              htmlFor="operating-hours"
            >
              <Textarea
                id="operating-hours"
                name="operating_hours"
                className="min-h-24 font-mono text-xs"
                defaultValue={Object.entries(current.operating_hours)
                  .map(([key, value]) => `${key}=${value}`)
                  .join("\n")}
              />
            </Field>
            <Field
              label={t("adminSettings.closedDays")}
              htmlFor="closed-days"
            >
              <Textarea
                id="closed-days"
                name="closed_days"
                className="min-h-24 text-xs"
                defaultValue={current.closed_days.join(", ")}
              />
            </Field>
            <Field
              label={t("adminSettings.slotCapacity")}
              htmlFor="slot-capacity"
            >
              <Textarea
                id="slot-capacity"
                name="slot_capacities"
                className="min-h-24 font-mono text-xs"
                defaultValue={Object.entries(current.slot_capacities)
                  .map(([key, value]) => `${key}=${value}`)
                  .join("\n")}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={saveSettings.isPending}>
              <Save className="h-3.5 w-3.5" />
              {t("adminSettings.save")}
            </Button>
          </div>
        </Card>
      </form>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-navy">
              {t("adminSettings.priceHistory")}
            </h2>
          </div>
          <form
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_110px_100px_110px_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const service = String(data.get("service_type"));
              addPrice.mutate({
                service_type: service,
                label: serviceLabels[service] ?? service,
                unit_mode: String(data.get("unit_mode")) as
                  | "PIECE"
                  | "KILOGRAM",
                price: String(data.get("price")),
                minimum_charge: String(data.get("minimum_charge")),
                effective_from: String(data.get("effective_from")),
                effective_until: null,
                is_active: true,
              });
              event.currentTarget.reset();
            }}
          >
            <Field label={t("adminSettings.service")} htmlFor="price-service">
              <Select
                id="price-service"
                name="service_type"
                defaultValue="VESTE"
              >
                {SERVICE_CODES.map((value) => (
                  <option key={value} value={value}>
                    {serviceLabels[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("adminSettings.mode")} htmlFor="price-mode">
              <Select id="price-mode" name="unit_mode" defaultValue="PIECE">
                <option value="PIECE">{t("adminSettings.perPiece")}</option>
                <option value="KILOGRAM">{t("adminSettings.perKg")}</option>
              </Select>
            </Field>
            <Field label={t("adminSettings.price")} htmlFor="price-value">
              <Input
                id="price-value"
                name="price"
                type="number"
                min="0"
                required
              />
            </Field>
            <Field label={t("adminSettings.minimum")} htmlFor="price-minimum">
              <Input
                id="price-minimum"
                name="minimum_charge"
                type="number"
                min="0"
                defaultValue="0"
              />
            </Field>
            <Field
              label={t("adminSettings.effective")}
              htmlFor="price-effective"
            >
              <Input
                id="price-effective"
                name="effective_from"
                type="date"
                required
              />
            </Field>
            <Button
              size="sm"
              type="submit"
              aria-label={t("adminSettings.addPrice")}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
          <div className="mt-2 divide-y divide-crease">
            {prices.data?.results.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-ink">{item.label}</p>
                  <p className="text-ink-muted">
                    {item.unit_mode === "KILOGRAM"
                      ? t("adminSettings.perKg")
                      : t("adminSettings.perPiece")}{" "}
                    · {t("adminSettings.from")} {item.effective_from}
                  </p>
                </div>
                <span className="font-semibold tabular-nums text-navy">
                  {formatCurrency(item.price)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    togglePrice.mutate({ id: item.id, active: !item.is_active })
                  }
                >
                  {item.is_active
                    ? t("adminSettings.disable")
                    : t("adminSettings.enable")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-navy">
            {t("adminSettings.subscriptionPlans")}
          </h2>
          <div className="space-y-3">
            {plans.data?.map((plan) => (
              <form
                key={plan.id}
                className="grid grid-cols-[1fr_100px_80px_auto] items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  savePlan.mutate({
                    id: plan.id,
                    input: {
                      plan: plan.plan,
                      label: String(data.get("label")),
                      price: String(data.get("price")),
                      kilos: String(data.get("kilos")),
                      is_active: data.get("active") === "on",
                    },
                  });
                }}
              >
                <Field
                  label={plan.plan}
                  htmlFor={`plan-label-${plan.id}`}
                >
                  <Input
                    id={`plan-label-${plan.id}`}
                    name="label"
                    defaultValue={plan.label}
                  />
                </Field>
                <Field
                  label={t("adminSettings.price")}
                  htmlFor={`plan-price-${plan.id}`}
                >
                  <Input
                    id={`plan-price-${plan.id}`}
                    name="price"
                    type="number"
                    min="0"
                    defaultValue={plan.price}
                  />
                </Field>
                <Field
                  label={t("adminSettings.kgAbbr")}
                  htmlFor={`plan-kilos-${plan.id}`}
                >
                  <Input
                    id={`plan-kilos-${plan.id}`}
                    name="kilos"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={plan.kilos}
                  />
                </Field>
                <div className="mb-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={plan.is_active}
                    aria-label={`${plan.label} active`}
                  />
                  <Button
                    size="sm"
                    type="submit"
                    aria-label={`Save ${plan.label}`}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            ))}
          </div>
          <form
            className="mt-3 grid grid-cols-2 gap-2 border-t border-crease pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              savePlan.mutate({
                input: {
                  plan: String(data.get("plan")).toUpperCase(),
                  label: String(data.get("label")),
                  price: String(data.get("price")),
                  kilos: String(data.get("kilos")),
                  is_active: true,
                },
              });
              event.currentTarget.reset();
            }}
          >
            <Field
              label={t("adminSettings.planCode")}
              htmlFor="new-plan-code"
            >
              <Input id="new-plan-code" name="plan" required />
            </Field>
            <Field label={t("adminSettings.label")} htmlFor="new-plan-label">
              <Input id="new-plan-label" name="label" required />
            </Field>
            <Field
              label={t("adminSettings.price")}
              htmlFor="new-plan-price"
            >
              <Input
                id="new-plan-price"
                name="price"
                type="number"
                min="0"
                required
              />
            </Field>
            <Field
              label={t("adminSettings.kilograms")}
              htmlFor="new-plan-kilos"
            >
              <Input
                id="new-plan-kilos"
                name="kilos"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </Field>
            <Button size="sm" type="submit" className="col-span-2">
              <Plus className="h-3.5 w-3.5" />
              {t("adminSettings.addPlan")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
