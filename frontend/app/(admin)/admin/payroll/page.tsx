"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Plus, Users } from "lucide-react";
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

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [employee, setEmployee] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [paidOn, setPaidOn] = useState(today());
  const [notes, setNotes] = useState("");

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

  const valid =
    Boolean(employee) &&
    Number(amount) > 0 &&
    Boolean(period) &&
    (status === "PENDING" || Boolean(paidOn));

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Payroll"
        description="Manage monthly staff salaries and payment status."
        action={
          <Button variant="gold" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4" />
            Add salary entry
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Banknote}
          label="Payroll for selected month"
          value={formatCurrency(totals.total)}
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid"
          value={formatCurrency(totals.paid)}
        />
        <StatCard
          icon={Users}
          label="Pending"
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
            New salary entry
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Each staff member can have one entry per pay period.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Staff member" htmlFor="payroll-employee">
              <Select
                id="payroll-employee"
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
              >
                <option value="">Select staff</option>
                {activeStaff.map((profile) => (
                  <option key={profile.user.id} value={profile.user.id}>
                    {profile.user.first_name} {profile.user.last_name} ·{" "}
                    {profile.role.toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Pay period" htmlFor="payroll-period">
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
            <Field label="Amount (XAF)" htmlFor="payroll-amount">
              <Input
                id="payroll-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field label="Payment status" htmlFor="payroll-status">
              <Select
                id="payroll-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "PENDING" | "PAID")
                }
              >
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </Select>
            </Field>
            {status === "PAID" ? (
              <Field label="Paid on" htmlFor="payroll-paid-on">
                <Input
                  id="payroll-paid-on"
                  type="date"
                  value={paidOn}
                  onChange={(event) => setPaidOn(event.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Notes (optional)" htmlFor="payroll-notes">
              <Input
                id="payroll-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Bonus, adjustment, reference…"
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
              {createEntry.isPending ? "Saving…" : "Save entry"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-navy">
            Salary ledger
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Paid entries are included in expense and profit reporting.
          </p>
        </div>
        <Field label="Pay period" htmlFor="ledger-period">
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
          <Th>Staff member</Th>
          <Th>Period</Th>
          <Th align="right">Amount</Th>
          <Th>Status</Th>
          <Th>Paid on</Th>
          <Th align="right">Action</Th>
        </THead>
        <TBody>
          {payroll.isLoading ? <TableSkeleton columns={6} /> : null}
          {!payroll.isLoading && !payroll.data?.results.length ? (
            <TableEmptyRow colSpan={6}>
              No salary entries for this month.
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
                  {entry.employee_detail.role.toLowerCase()}
                </p>
              </Td>
              <Td>
                {new Date(`${entry.pay_period}T00:00:00`).toLocaleDateString(
                  undefined,
                  { month: "long", year: "numeric" },
                )}
              </Td>
              <Td align="right" className="font-medium tabular-nums">
                {formatCurrency(entry.amount)}
              </Td>
              <Td>
                <StatusBadge
                  label={entry.status}
                  tone={entry.status === "PAID" ? "ready" : "progress"}
                />
              </Td>
              <Td className="text-ink-muted">
                {entry.paid_on
                  ? new Date(`${entry.paid_on}T00:00:00`).toLocaleDateString()
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
                    Mark paid
                  </Button>
                ) : (
                  <span className="text-xs text-ink-muted">Complete</span>
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
