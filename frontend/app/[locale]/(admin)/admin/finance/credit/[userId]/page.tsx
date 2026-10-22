"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MinusCircle, PlusCircle } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  TableContainer,
  TableEmptyRow,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { CreditTransactionForm } from "@/src/components/finance/CreditTransactionForm";
import { Button, Card, StatusBadge } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";

export default function AdminCreditAccountDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const { locale, t } = useI18n();
  const [activeForm, setActiveForm] = useState<"charge" | "pay" | null>(null);

  const creditTxLabel: Record<string, string> = {
    CHARGE: t("adminCredit.chargeLabel"),
    PAYMENT: t("adminCredit.paymentLabel"),
    ADJUSTMENT: t("adminCredit.adjustmentLabel"),
  };

  const {
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.finance.creditAccounts.detail(userId),
    queryFn: () => financeApi.getCreditAccount(userId),
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        {t("common.loading")}
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Link
          href="/admin/finance/credit"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("adminCredit.backToCredit")}
        </Link>
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  const fullName =
    `${account.user.first_name} ${account.user.last_name}`.trim() ||
    `Customer #${account.user.id}`;
  const balance = Number(account.balance);
  const nearLimit =
    balance > 0 && balance >= Number(account.credit_limit) * 0.9;

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/finance/credit"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminCredit.backToCredit")}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {fullName}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {account.user.phone_number}
          </p>
        </div>
        <Link
          href={`/admin/customers/${account.user.id}`}
          className="text-xs text-navy hover:underline"
        >
          {t("adminCredit.viewFicheClient")}
        </Link>
      </div>

      <Card className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-muted">
              {t("adminCredit.balanceOwed")}
            </p>
            <p
              className={`text-2xl font-semibold tabular-nums ${balance > 0 ? "text-status-cancelled-text" : "text-navy"}`}
            >
              {formatCurrency(account.balance)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {t("adminCredit.ofLimit").replace(
                "{limit}",
                formatCurrency(account.credit_limit),
              )}
              {nearLimit && (
                <span className="ml-2">
                  <StatusBadge
                    label={t("adminCredit.nearLimit")}
                    tone="cancelled"
                  />
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setActiveForm(activeForm === "pay" ? null : "pay")}
            >
              <MinusCircle className="h-4 w-4" aria-hidden="true" />
              {t("adminCredit.recordPayment")}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setActiveForm(activeForm === "charge" ? null : "charge")
              }
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              {t("adminCredit.addCharge")}
            </Button>
          </div>
        </div>
        <p className="mt-3 border-t border-crease pt-3 text-xs text-ink-muted">
          {account.days_since_last_activity === null
            ? t("adminCredit.noActivityYet")
            : account.days_since_last_activity === 0
              ? t("adminCredit.lastActivityToday")
              : account.days_since_last_activity === 1
                ? t("adminCredit.lastActivityDaysAgo").replace("{count}", "1")
                : t("adminCredit.lastActivityDaysAgoPlural").replace(
                    "{count}",
                    String(account.days_since_last_activity),
                  )}
        </p>
      </Card>

      {activeForm && (
        <div className="mb-6">
          <CreditTransactionForm
            userId={userId}
            mode={activeForm}
            onDone={() => setActiveForm(null)}
          />
        </div>
      )}

      <h2 className="font-display mb-3 text-sm font-medium text-ink">
        {t("adminCredit.txHistory")}
      </h2>
      <TableContainer>
        <THead>
          <Th>{t("adminCredit.colType")}</Th>
          <Th align="right">{t("adminCredit.colAmount")}</Th>
          <Th>{t("adminCredit.colNote")}</Th>
          <Th>{t("adminCredit.colOrder")}</Th>
          <Th>{t("adminCredit.colBy")}</Th>
          <Th align="right">{t("adminCredit.colWhen")}</Th>
        </THead>
        <TBody>
          {account.transactions.length === 0 && (
            <TableEmptyRow colSpan={6}>
              {t("adminCredit.noCreditActivity")}
            </TableEmptyRow>
          )}
          {account.transactions.map((tx) => (
            <Tr key={tx.id}>
              <Td>
                {creditTxLabel[tx.transaction_type] ?? tx.transaction_type}
              </Td>
              <Td
                align="right"
                className={`tabular-nums ${tx.transaction_type === "PAYMENT" ? "text-status-ready-text" : "text-ink"}`}
              >
                {tx.transaction_type === "PAYMENT" ? "-" : ""}
                {formatCurrency(tx.amount)}
              </Td>
              <Td className="text-ink-muted">{tx.note || "—"}</Td>
              <Td className="text-ink-muted">
                {tx.order ? (
                  <Link
                    href={`/admin/orders/${tx.order}`}
                    className="text-navy hover:underline"
                  >
                    #{tx.order}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td className="text-ink-muted">{tx.created_by || "—"}</Td>
              <Td align="right" className="whitespace-nowrap text-ink-muted">
                {new Date(tx.created_at).toLocaleString(
                  locale === "fr" ? "fr-FR" : "en-US",
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableContainer>
    </main>
  );
}
