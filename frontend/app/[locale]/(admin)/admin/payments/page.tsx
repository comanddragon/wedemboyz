"use client";
import { COLLECTION_METHODS, paymentState } from "@/src/lib/payment-options";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, CreditCard, ReceiptText, RotateCcw } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import { SearchInput } from "@/src/components/admin/SearchInput";
import { Tabs } from "@/src/components/admin/Tabs";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { Button, Select, StatusBadge, paymentStatusTone } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { customerFullName, customerNumber } from "@/src/lib/utils";
import type { PaymentMethodType, PaymentStatus } from "@/src/types";
import { useI18n } from "@/src/i18n/I18nProvider";

const METHOD_LABELS: Partial<Record<PaymentMethodType, string>> = { PAY_AT_PICKUP: "Pay on pickup", PAY_AFTER_DELIVERY: "Pay on delivery", MTN_MOMO: "MTN Mobile Money", ORANGE_MONEY: "Orange Money", CASH: "Cash", BANK_TRANSFER: "Bank transfer", OTHER: "Other" };
const STATUS_OPTIONS = [{ value: "ALL", label: "All statuses" }, { value: "SUCCEEDED", label: "Paid" }, { value: "PENDING", label: "Unpaid" }] as const;
const METHOD_OPTIONS = [{ value: "ALL", label: "All options" }, ...COLLECTION_METHODS];

export default function AdminPaymentsPage() {
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "ALL">("ALL");
  const [method, setMethod] = useState<PaymentMethodType | "ALL">("ALL");
  const [period, setPeriod] = useState("ALL");
  const { data, isLoading, error } = useQuery({ queryKey: queryKeys.payments.list(page), queryFn: () => paymentsApi.listPayments(page) });

  const payments = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = Date.now();
    const cutoff = period === "7" ? now - 7 * 864e5 : period === "30" ? now - 30 * 864e5 : 0;
    return data?.results.filter((payment) => {
      const name = customerFullName(payment.customer)?.toLowerCase() ?? payment.payer_name.toLowerCase();
      const phone = customerNumber(payment.customer)?.toLowerCase() ?? payment.payer_phone.toLowerCase();
      const searchable = `${payment.id} ${payment.order ?? ""} ${payment.reference} ${payment.gateway_reference} ${name} ${phone}`.toLowerCase();
      return (!term || searchable.includes(term)) && (status === "ALL" || paymentState(payment.status) === (status === "SUCCEEDED" ? "PAID" : "UNPAID")) && (method === "ALL" || payment.payment_method_type === method) && (!cutoff || new Date(payment.received_at).getTime() >= cutoff);
    });
  }, [data, search, status, method, period]);

  const summary = useMemo(() => ({
    received: payments?.filter((p) => p.status === "SUCCEEDED").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0,
    pending: payments?.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0,
    refunds: payments?.filter((p) => p.status.includes("REFUNDED")).reduce((sum, p) => sum + Number(p.amount), 0) ?? 0,
  }), [payments]);

  const clearFilters = () => { setSearch(""); setStatus("ALL"); setMethod("ALL"); setPeriod("ALL"); };
  const hasFilters = Boolean(search || status !== "ALL" || method !== "ALL" || period !== "ALL");

  return <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title={t("adminFinance.payments")} description={t("adminFinance.paymentsBody")} />
    <Tabs items={[{ href: "/admin/payments", label: t("adminFinance.payments") }, { href: "/admin/payments/refunds", label: t("adminFinance.refunds") }, { href: "/admin/payments/invoices", label: t("adminFinance.invoices") }]} />

    <section className="mb-6 grid overflow-hidden rounded-2xl border border-crease bg-white sm:grid-cols-3" aria-label="Payment summary">
      {[
        { label: t("adminFinance.received"), value: summary.received, icon: CreditCard, tone: "text-status-complete-text bg-status-complete-bg" },
        { label: t("adminFinance.pending"), value: summary.pending, icon: CalendarDays, tone: "text-status-pending-text bg-status-pending-bg" },
        { label: t("adminFinance.refunded"), value: summary.refunds, icon: RotateCcw, tone: "text-status-progress-text bg-status-progress-bg" },
      ].map(({ label, value, icon: Icon, tone }, index) => <div key={label} className={`flex items-center gap-3 px-5 py-4 ${index ? "border-t border-crease sm:border-l sm:border-t-0" : ""}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><div><p className="text-xs text-ink-muted">{label} {t("adminFinance.inView")}</p><p className="font-display text-xl font-semibold tabular-nums text-navy">{formatCurrency(value)}</p></div></div>)}
    </section>

    <div className="mb-5 grid gap-3 rounded-2xl border border-crease bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_180px_190px_170px_auto]">
      <SearchInput placeholder={t("adminFinance.searchPayments")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("adminFinance.searchPayments")} />
      <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | "ALL")} aria-label="Filter by status">{STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.value === "ALL" ? t("adminFinance.allStatuses") : t(`common.statuses.${item.value === "SUCCEEDED" ? "paid" : "unpaid"}`)}</option>)}</Select>
      <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodType | "ALL")} aria-label="Filter by payment method">{METHOD_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.value === "ALL" ? t("adminFinance.allMethods") : item.value === "CASH" ? t("adminFinance.cash") : item.value === "BANK_TRANSFER" ? t("adminFinance.transfer") : item.value === "OTHER" ? t("adminFinance.other") : item.label}</option>)}</Select>
      <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Filter by date"><option value="ALL">{t("adminFinance.anyDate")}</option><option value="7">{t("adminFinance.last7")}</option><option value="30">{t("adminFinance.last30")}</option></Select>
      <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>{t("adminFinance.clear")}</Button>
    </div>

    {error && <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(error)}</p>}
    <section className="overflow-hidden rounded-2xl border border-crease bg-white" aria-label="Payment ledger">
      <div className="flex items-center justify-between border-b border-crease bg-steam/35 px-5 py-3"><p className="text-xs font-medium text-ink-muted">{t("adminFinance.ledger")}</p>{data && <p className="text-xs text-ink-muted">{payments?.length ?? 0} {t("adminFinance.shown")} · {data.count} {t("adminFinance.total")}</p>}</div>
      {isLoading ? <div className="space-y-px">{[0,1,2,3].map((item) => <div key={item} className="h-24 animate-pulse bg-steam/40" />)}</div> : payments?.length ? <div className="divide-y divide-crease">{payments.map((payment) => {
        const name = customerFullName(payment.customer) || payment.payer_name || "Customer";
        return <Link key={payment.id} href={`/admin/payments/${payment.id}`} className="grid gap-3 px-4 py-4 transition-colors hover:bg-steam/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gold/30 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:px-5">
          <span className="relative"><CustomerAvatar name={name} /><span className="absolute -bottom-1 -right-2 rounded-md bg-white shadow-card-sm"><PaymentMethodIcon method={payment.payment_method_type} className="h-5 w-7" /></span></span>
          <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-navy">{name}</span><StatusBadge label={paymentState(payment.status)} tone={paymentStatusTone(payment.status)} /></span><span className="mt-1 block truncate text-xs text-ink-muted">{METHOD_LABELS[payment.payment_method_type]} · {payment.order ? `${t("adminFinance.order")} #${payment.order}` : `${t("adminFinance.subscription")} #${payment.subscription}`}{payment.reference ? ` · ${t("adminFinance.ref")} ${payment.reference}` : ""}</span></span>
          <span className="sm:text-right"><span className="block font-display text-lg font-semibold tabular-nums text-navy">{formatCurrency(payment.amount)}</span><span className="block text-xs text-ink-muted">{new Date(payment.received_at).toLocaleString(locale)}</span></span>
          <ArrowUpRight className="hidden h-4 w-4 text-ink-muted sm:block" aria-hidden="true" />
        </Link>;
      })}</div> : <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-ink-muted"><div><ReceiptText className="mx-auto mb-3 h-6 w-6" aria-hidden="true" />{t("adminFinance.noPayments")}</div></div>}
    </section>
    {data && <Pagination currentPage={data.current_page} numPages={data.num_pages} onPageChange={setPage} />}
  </main>;
}
