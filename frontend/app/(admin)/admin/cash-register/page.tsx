"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, LockKeyhole, Plus } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import { Pagination } from "@/src/components/admin/Pagination";
import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/src/components/admin/Table";
import { Button, Field, Input, StatusBadge } from "@/src/components/ui";
import { financeApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import type { CashRegisterDay, PaymentMethodTotals } from "@/src/types";

const today = () => new Date().toISOString().slice(0, 10);
const METHODS: Array<[keyof PaymentMethodTotals, string]> = [
  ["CASH", "Cash"], ["MTN_MOMO", "MTN MoMo"], ["ORANGE_MONEY", "Orange Money"],
  ["BANK_TRANSFER", "Transfer"], ["OTHER", "Other"],
];

function MethodTotals({ totals }: { totals: PaymentMethodTotals }) {
  const visible = METHODS.filter(([key]) => Number(totals[key] ?? 0) !== 0);
  if (!visible.length) return <span className="text-ink-muted">No receipts</span>;
  return <div className="flex flex-wrap gap-x-3 gap-y-1">{visible.map(([key, label]) => <span key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap"><PaymentMethodIcon method={key} className="h-7 w-9 p-1" /><span className="text-ink-muted">{label}</span> {formatCurrency(totals[key] ?? 0)}</span>)}</div>;
}

export default function CashRegisterPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showOpen, setShowOpen] = useState(false);
  const [closing, setClosing] = useState<CashRegisterDay | null>(null);
  const registers = useQuery({
    queryKey: queryKeys.finance.cashRegister.list(page),
    queryFn: () => financeApi.listCashRegisterDays(page),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance", "cash-register"] });
  const openRegister = useMutation({
    mutationFn: (input: Parameters<typeof financeApi.openCashRegister>[0]) => financeApi.openCashRegister(input),
    onSuccess: () => { refresh(); setShowOpen(false); },
  });
  const closeRegister = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Parameters<typeof financeApi.closeCashRegister>[1] }) => financeApi.closeCashRegister(id, input),
    onSuccess: () => { refresh(); setClosing(null); },
  });

  return <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Cash close" description="Match the counter drawer against recorded payments and refunds at the end of each day." action={<Button variant="gold" onClick={() => setShowOpen((value) => !value)}><Plus className="h-4 w-4" /> Open day</Button>} />
    {showOpen ? <form className="mb-5 grid gap-3 rounded-xl border border-crease bg-white p-4 sm:grid-cols-[180px_200px_1fr_auto] sm:items-end" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      openRegister.mutate({ date: String(data.get("date")), opening_float: Number(data.get("opening_float")), notes: String(data.get("notes") ?? "") });
    }}>
      <Field label="Business date" htmlFor="register-date"><Input id="register-date" name="date" type="date" defaultValue={today()} required /></Field>
      <Field label="Opening float (XAF)" htmlFor="opening-float"><Input id="opening-float" name="opening_float" type="number" min="0" defaultValue="0" required /></Field>
      <Field label="Opening note" htmlFor="opening-note"><Input id="opening-note" name="notes" placeholder="Optional handover note" /></Field>
      <Button type="submit" size="sm" disabled={openRegister.isPending}>Open register</Button>
      {openRegister.error ? <p className="text-xs text-status-cancelled-text sm:col-span-full">{getApiErrorMessage(openRegister.error)}</p> : null}
    </form> : null}

    {closing ? <form className="mb-5 rounded-xl border border-crease bg-white p-4 shadow-card-sm" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      closeRegister.mutate({ id: closing.id, input: { counted_cash: Number(data.get("counted_cash")), cash_expenses: Number(data.get("cash_expenses") || 0), notes: String(data.get("notes") ?? "") } });
    }}>
      <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-display text-base font-semibold text-navy">Close {new Date(`${closing.date}T00:00:00`).toLocaleDateString()}</h2><p className="mt-1 text-xs text-ink-muted">Expected drawer before unrecorded cash expenses: {formatCurrency(closing.expected_cash)}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setClosing(null)}>Cancel</Button></div>
      <div className="grid gap-3 sm:grid-cols-[180px_180px_1fr_auto] sm:items-end">
        <Field label="Counted cash" htmlFor="counted-cash"><Input id="counted-cash" name="counted_cash" type="number" min="0" required /></Field>
        <Field label="Cash expenses" htmlFor="cash-expenses"><Input id="cash-expenses" name="cash_expenses" type="number" min="0" defaultValue={closing.cash_expenses} /></Field>
        <Field label="Closing note" htmlFor="closing-note"><Input id="closing-note" name="notes" defaultValue={closing.notes} /></Field>
        <Button type="submit" variant="gold" size="sm" disabled={closeRegister.isPending}><LockKeyhole className="h-3.5 w-3.5" /> Close day</Button>
      </div>
      {closeRegister.error ? <p className="mt-2 text-xs text-status-cancelled-text">{getApiErrorMessage(closeRegister.error)}</p> : null}
    </form> : null}

    {registers.error ? <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(registers.error)}</p> : null}
    <TableContainer><THead><Th>Date</Th><Th>Received</Th><Th align="right">Expected cash</Th><Th align="right">Counted</Th><Th align="right">Variance</Th><Th>Status</Th><Th /></THead><TBody>
      {registers.isLoading ? <TableSkeleton columns={7} /> : null}
      {!registers.isLoading && !registers.data?.results.length ? <TableEmptyRow colSpan={7}><span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4" /> No register days yet.</span></TableEmptyRow> : null}
      {registers.data?.results.map((day) => <Tr key={day.id}>
        <Td className="whitespace-nowrap font-medium">{new Date(`${day.date}T00:00:00`).toLocaleDateString()}</Td>
        <Td className="text-xs"><MethodTotals totals={day.received_by_method} /></Td>
        <Td align="right" className="tabular-nums">{formatCurrency(day.expected_cash)}</Td>
        <Td align="right" className="tabular-nums text-ink-muted">{day.counted_cash === null ? "—" : formatCurrency(day.counted_cash)}</Td>
        <Td align="right" className={`tabular-nums ${Number(day.variance ?? 0) === 0 ? "text-status-ready-text" : "text-status-cancelled-text"}`}>{day.variance === null ? "—" : formatCurrency(day.variance)}</Td>
        <Td><StatusBadge label={day.status} tone={day.status === "CLOSED" ? "ready" : "progress"} /></Td>
        <Td align="right">{day.status === "OPEN" ? <Button size="sm" variant="secondary" onClick={() => setClosing(day)}>Reconcile</Button> : null}</Td>
      </Tr>)}
    </TBody></TableContainer>
    {registers.data ? <Pagination currentPage={registers.data.current_page} numPages={registers.data.num_pages} onPageChange={setPage} /> : null}
  </main>;
}
