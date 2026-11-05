"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Users } from "lucide-react";
import { useState } from "react";

import { LoyaltyCashouts } from "@/src/components/loyalty-cashouts";
import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Field, Input, Select } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { customersApi, discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { useI18n } from "@/src/i18n/I18nProvider";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";

export default function AdminAmbassadorsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const ambassadors = useQuery({
    queryKey: ["ambassadors", "admin"],
    queryFn: discountsApi.listAmbassadors,
    enabled: Boolean(user?.is_superuser),
  });
  const customers = useQuery({
    queryKey: ["customers", "ambassador-picker"],
    queryFn: () => customersApi.listCustomers({ page: 1, active: true }),
    enabled: Boolean(user?.is_superuser),
  });
  const createMutation = useMutation({
    mutationFn: () => discountsApi.createAmbassador(Number(customerId)),
    onSuccess: () => {
      setCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["ambassadors"] });
    },
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      discountsApi.updateAmbassador(id, active),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ambassadors"] }),
  });
  const codeMutation = useMutation({
    mutationFn: ({ id, promo_code }: { id: number; promo_code: string }) => discountsApi.updateAmbassador(id, { promo_code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ambassadors"] }),
  });
  const creditMutation = useMutation({
    mutationFn: ({ id, credit_balance }: { id: number; credit_balance: string }) =>
      discountsApi.updateAmbassador(id, { credit_balance }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ambassadors"] }),
  });
  const error =
    ambassadors.error ||
    customers.error ||
    createMutation.error ||
    toggleMutation.error || codeMutation.error || creditMutation.error;

  if (!user?.is_superuser)
    return (
      <main className="grid min-h-64 place-items-center p-8 text-sm text-ink-muted">
        {t("adminPrograms.ownerOnlyAmbassadors")}
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminPrograms.ambassadors")}
        description={t("adminPrograms.ambassadorsBody")}
      />
      {error ? (
        <p className="mb-5 rounded-xl bg-status-cancelled-bg px-4 py-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      ) : null}
      <form
        className="mb-7 flex flex-col gap-3 rounded-2xl border border-crease bg-white p-5 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (customerId) createMutation.mutate();
        }}
      >
        <div className="min-w-0 flex-1">
          <Field label={t("adminPrograms.customerAccount")} htmlFor="ambassador-customer" className="mb-0">
            <Select
              id="ambassador-customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              required
            >
              <option value="">{t("adminPrograms.chooseCustomer")}</option>
              {customers.data?.results.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.first_name || customer.last_name
                    ? `${customer.first_name} ${customer.last_name}`.trim()
                    : customer.phone_number}{" "}
                  · {customer.phone_number}{!customer.avatar ? ` · (${t("adminPrograms.photoPending")})` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          type="submit"
          disabled={!customerId || createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          {t("adminPrograms.assign")}
        </Button>
      </form>
      <section
        className="overflow-hidden rounded-2xl border border-crease bg-white"
        aria-label="Ambassador accounts"
      >
        <div className="flex items-center gap-3 border-b border-crease px-5 py-4">
          <Users className="h-5 w-5 text-gold" />
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">
              {t("adminPrograms.roster")}
            </h2>
            <p className="text-xs text-ink-muted">
              {t("adminPrograms.rosterBody")}
            </p>
          </div>
        </div>
        {ambassadors.data?.length ? (
          <div className="divide-y divide-crease">
            {ambassadors.data.map((ambassador) => (
              <article
                key={ambassador.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <CustomerAvatar name={ambassador.name} size="sm" imageUrl={ambassador.profile_photo} forceProfilePhoto />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-navy">
                        {ambassador.name}
                      </p>
                      {!ambassador.profile_photo ? (
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-800">
                          {t("adminPrograms.photoPending")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-muted">
                      {ambassador.phone_number}
                    </p>
                  </div>
                </div>
                <form key={ambassador.promo_code} className="flex flex-wrap items-center gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  const code = new FormData(event.currentTarget).get("promo_code");
                  if (typeof code === "string" && code.trim()) codeMutation.mutate({ id: ambassador.id, promo_code: code.trim() });
                }}>
                  <Input name="promo_code" defaultValue={ambassador.promo_code} required minLength={2} maxLength={30} pattern="[A-Za-z0-9_-]+" aria-label={t("cashouts.promoCode")} className="max-w-44" />
                  <Button type="submit" disabled={codeMutation.isPending}>{t("cashouts.saveCode")}</Button>
                  <button type="button" aria-label={t("cashouts.copyCode")} onClick={() => navigator.clipboard.writeText(ambassador.promo_code)} className="rounded-lg p-2 text-navy"><Copy className="h-4 w-4" /></button>
                </form>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <form key={ambassador.credit_balance} className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                    event.preventDefault();
                    const balance = new FormData(event.currentTarget).get("credit_balance");
                    if (typeof balance === "string") creditMutation.mutate({ id: ambassador.id, credit_balance: balance });
                  }}>
                    <Field label={t("adminPrograms.availableCredits")} htmlFor={`ambassador-credit-${ambassador.id}`} className="mb-0">
                      <Input id={`ambassador-credit-${ambassador.id}`} name="credit_balance" type="number" min={0} max={999999999999} step={1} required defaultValue={ambassador.credit_balance} aria-label={`${ambassador.name}: ${t("adminPrograms.availableCredits")}`} className="w-36" />
                    </Field>
                    <Button type="submit" disabled={creditMutation.isPending}>{t("adminPrograms.saveCredits")}</Button>
                  </form>
                  <button
                    type="button"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: ambassador.id,
                        active: !ambassador.is_active,
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ambassador.is_active ? "bg-status-ready-bg text-status-ready-text" : "bg-steam text-ink-muted"}`}
                  >
                    {ambassador.is_active ? t("adminPrograms.active") : t("adminPrograms.paused")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center text-sm text-ink-muted">
            {t("adminPrograms.noAmbassadors")}
          </div>
        )}
      </section>
      <LoyaltyCashouts admin />
    </main>
  );
}
