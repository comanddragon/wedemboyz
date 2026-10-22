"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Download, Plus, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import {
  TableContainer,
  TableEmptyRow,
  TableSkeleton,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { StatCard } from "@/src/components/dashboard/StatCard";
import { Button, Field, Input, Select, StatusBadge } from "@/src/components/ui";
import { financeApi, staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { StaffRole } from "@/src/types";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { locale, t } = useI18n();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [employee, setEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [paidOn, setPaidOn] = useState(today());
  const [notes, setNotes] = useState("");

  const roleLabels: Record<StaffRole, string> = {
    MANAGER: t("adminCommon.roles.manager"),
    ATTENDANT: t("adminCommon.roles.attendant"),
    CASHIER: t("adminCommon.roles.cashier"),
    DRIVER: t("adminOrders.driver"),
  };

  const params = { page, period };
  const payroll = useQuery({
    queryKey: queryKeys.finance.payroll.list(params),
    queryFn: () => financeApi.listPayrollEntries(params),
  });
  const staff = useQuery({
    queryKey: queryKeys.staff.roster,
    queryFn: staffApi.listStaff,
  });

  const activeStaff =
    staff.data?.results.filter((profile) => profile.is_active) ?? [];
  const totals = useMemo(() => {
    const entries = payroll.data?.results ?? [];
    return {
      total: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
      paid: entries
        .filter((entry) => entry.status === "PAID")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
      pending: entries
        .filter((entry) => entry.status === "PENDING")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    };
  }, [payroll.data]);

  const createEntry = useMutation({
    mutationFn: () =>
      financeApi.createPayrollEntry({
        employee: Number(employee),
        pay_period: `${period}-01`,
        amount: Number(amount),
        status,
        paid_on: status === "PAID" ? paidOn : null,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "payroll"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
      setEmployee("");
      setAmount("");
      setNotes("");
      setStatus("PENDING");
      setShowForm(false);
    },
  });

  const markPaid = useMutation({
    mutationFn: (id: number) =>
      financeApi.updatePayrollEntry(id, { status: "PAID", paid_on: today() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "payroll"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "analytics"] });
    },
  });

  const generatePayroll = useMutation({
    mutationFn: () => financeApi.generatePayroll(period),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "payroll"] }),
  });

  const valid =
    Boolean(employee) &&
    Number(amount) > 0 &&
    Boolean(period) &&
    (status === "PENDING" || Boolean(paidOn));

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title={t("adminPayroll.title")}
        description={t("adminPayroll.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => financeApi.exportPayroll(period)}
            >
              <Download className="h-4 w-4" /> {t("adminPayroll.exportBtn")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => generatePayroll.mutate()}
              disabled={generatePayroll.isPending}
            >
              <Sparkles className="h-4 w-4" /> {t("adminPayroll.generateMonth")}
            </Button>
            <Button
              variant="gold"
              onClick={() => setShowForm((value) => !value)}
            >
              <Plus className="h-4 w-4" /> {t("adminPayroll.addSalaryEntry")}
            </Button>
          </div>
        }
      />

      {generatePayroll.data ? (
        <p className="mb-4 text-sm text-ink-muted">
          {t("adminPayroll.generatedSummary")
            .replace("{created}", String(generatePayroll.data.created_count))
            .replace("{skipped}", String(generatePayroll.data.skipped_count))}
        </p>
      ) : null}
      {generatePayroll.error ? (
        <p className="mb-4 text-sm text-status-cancelled-text">
          {getApiErrorMessage(generatePayroll.error)}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Banknote}
          label={t("adminPayroll.statMonthPayroll")}
          value={formatCurrency(totals.total)}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("adminPayroll.paid")}
          value={formatCurrency(totals.paid)}
        />
        <StatCard
          icon={Users}
          label={t("adminPayroll.pending")}
          value={formatCurrency(totals.pending)}
          accent="gold"
        />
      </div>

      {showForm ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) createEntry.mutate();
          }}
          className="mb-6 rounded-xl border border-crease bg-white p-5 shadow-card-sm"
        >
          <h2 className="font-display text-base font-semibold text-navy">
            {t("adminPayroll.newSalaryEntry")}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {t("adminPayroll.newSalaryEntryHint")}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("adminPayroll.employee")} htmlFor="payroll-employee">
              <Select
                id="payroll-employee"
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">{t("adminPayroll.selectStaff")}</option>
                {activeStaff.map((profile) => (
                  <option key={profile.user.id} value={profile.user.id}>
                    {profile.user.first_name} {profile.user.last_name} ·{" "}
                    {roleLabels[profile.role] || profile.role}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("adminPayroll.period")} htmlFor="payroll-period">
              <Input
                id="payroll-period"
                type="month"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setPage(1);
                }}
              />
            </Field>
            <Field label={t("adminPayroll.amount")} htmlFor="payroll-amount">
              <Input
                id="payroll-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label={t("adminPayroll.paymentStatus")} htmlFor="payroll-status">
              <Select
                id="payroll-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "PENDING" | "PAID")
                }
              >
                <option value="PENDING">{t("adminPayroll.pending")}</option>
                <option value="PAID">{t("adminPayroll.paid")}</option>
              </Select>
            </Field>
            {status === "PAID" ? (
              <Field label={t("adminPayroll.paidOn")} htmlFor="payroll-paid-on">
                <Input
                  id="payroll-paid-on"
                  type="date"
                  value={paidOn}
                  onChange={(event) => setPaidOn(event.target.value)}
                />
              </Field>
            ) : null}
            <Field label={t("adminPayroll.notesOptional")} htmlFor="payroll-notes">
              <Input
                id="payroll-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("adminPayroll.notesPlaceholder")}
              />
            </Field>
          </div>
          {createEntry.isError ? (
            <p className="mt-3 text-sm text-status-cancelled-text">
              {getApiErrorMessage(createEntry.error)}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={!valid || createEntry.isPending}>
              {createEntry.isPending
                ? t("adminPayroll.saving")
                : t("adminPayroll.saveEntry")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              {t("adminPayroll.cancel")}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-navy">
            {t("adminPayroll.salaryLedger")}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {t("adminPayroll.salaryLedgerHint")}
          </p>
        </div>
        <Field label={t("adminPayroll.period")} htmlFor="ledger-period">
          <Input
            id="ledger-period"
            type="month"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>

      {payroll.isError ? (
        <p className="mb-3 text-sm text-status-cancelled-text">
          {getApiErrorMessage(payroll.error)}
        </p>
      ) : null}
      <TableContainer>
        <THead>
          <Th>{t("adminPayroll.employee")}</Th>
          <Th>{t("adminPayroll.colPeriod")}</Th>
          <Th align="right">{t("adminPayroll.amount")}</Th>
          <Th>{t("adminPayroll.status")}</Th>
          <Th>{t("adminPayroll.paidOn")}</Th>
          <Th align="right">{t("adminPayroll.action")}</Th>
        </THead>
        <TBody>
          {payroll.isLoading ? <TableSkeleton columns={6} /> : null}
          {!payroll.isLoading && !payroll.data?.results.length ? (
            <TableEmptyRow colSpan={6}>
              {t("adminPayroll.noEntriesMonth")}
            </TableEmptyRow>
          ) : null}
          {payroll.data?.results.map((entry) => (
            <Tr key={entry.id}>
              <Td>
                <p className="font-medium text-ink">
                  {entry.employee_detail.first_name}{" "}
                  {entry.employee_detail.last_name}
                </p>
                <p className="text-xs text-ink-muted">
                  {roleLabels[entry.employee_detail.role as StaffRole] ||
                    entry.employee_detail.role.toLowerCase()}
                </p>
              </Td>
              <Td>
                {new Date(`${entry.pay_period}T00:00:00`).toLocaleDateString(
                  locale === "fr" ? "fr-FR" : "en-US",
                  { month: "long", year: "numeric" },
                )}
              </Td>
              <Td align="right" className="font-medium tabular-nums">
                {formatCurrency(entry.amount)}
              </Td>
              <Td>
                <StatusBadge
                  label={
                    entry.status === "PAID"
                      ? t("adminPayroll.paid")
                      : t("adminPayroll.pending")
                  }
                  tone={entry.status === "PAID" ? "ready" : "progress"}
                />
              </Td>
              <Td className="text-ink-muted">
                {entry.paid_on
                  ? new Date(`${entry.paid_on}T00:00:00`).toLocaleDateString(
                      locale === "fr" ? "fr-FR" : "en-US",
                    )
                  : "—"}
              </Td>
              <Td align="right">
                {entry.status === "PENDING" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={markPaid.isPending}
                    onClick={() => markPaid.mutate(entry.id)}
                  >
                    {t("adminPayroll.markPaid")}
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">
                    {t("adminPayroll.complete")}
                  </span>
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableContainer>
      {payroll.data ? (
        <Pagination
          currentPage={payroll.data.current_page}
          numPages={payroll.data.num_pages}
          onPageChange={setPage}
        />
      ) : null}
    </main>
  );
}
