"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Users } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Field, Select } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { customersApi, discountsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

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
  const error =
    ambassadors.error ||
    customers.error ||
    createMutation.error ||
    toggleMutation.error;

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
          <Field label={t("adminPrograms.customerAccount")}>
            <Select
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
                  · {customer.phone_number}
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
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {ambassador.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {ambassador.phone_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(ambassador.promo_code)
                  }
                  className="flex items-center gap-2 rounded-xl bg-gold-50 px-3 py-2 text-sm font-semibold text-navy"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {ambassador.promo_code}
                </button>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-navy">
                      {formatCurrency(Number(ambassador.credit_balance))}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {t("adminPrograms.availableCredits")}
                    </p>
                  </div>
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
    </main>
  );
}
