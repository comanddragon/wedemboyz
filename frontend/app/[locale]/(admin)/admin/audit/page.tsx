"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Button, Card, Input } from "@/src/components/ui";
import { staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const audit = useQuery({ queryKey: ["staff", "audit", page, search, action], queryFn: () => staffApi.listAuditLog({ page, search, action }) });

  return <main className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Audit log" description="Review operational changes made by staff across orders, payments, inventory, and settings." />
    <Card className="p-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search staff or description" aria-label="Search audit log" /></label>
        <Input value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} placeholder="Filter action, e.g. order" aria-label="Filter by action" />
      </div>
      {audit.error ? <p className="py-4 text-sm text-status-cancelled-text">{getApiErrorMessage(audit.error)}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-crease text-[11px] uppercase tracking-wide text-ink-muted"><tr><th className="px-2 py-2 font-semibold">Time</th><th className="px-2 py-2 font-semibold">Staff</th><th className="px-2 py-2 font-semibold">Action</th><th className="px-2 py-2 font-semibold">Details</th></tr></thead>
          <tbody className="divide-y divide-crease">{audit.data?.results.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-2 py-2.5 tabular-nums text-ink-muted">{new Date(entry.created_at).toLocaleString()}</td><td className="px-2 py-2.5"><p className="font-semibold text-ink">{entry.staff_name || "Staff member"}</p><p className="text-ink-muted">{entry.staff_phone}</p></td><td className="px-2 py-2.5 font-mono text-[11px] text-dashboard-blue">{entry.action}</td><td className="max-w-xl px-2 py-2.5 text-ink-soft">{entry.description || "—"}</td></tr>)}</tbody>
        </table>
      </div>
      {!audit.isLoading && !audit.data?.results.length ? <p className="py-10 text-center text-sm text-ink-muted">No matching activity found.</p> : null}
      {audit.data && audit.data.num_pages > 1 ? <div className="mt-4 flex items-center justify-end gap-2"><Button size="sm" variant="secondary" aria-label="Previous page" disabled={!audit.data.previous} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button><span className="text-xs text-ink-muted">{page} / {audit.data.num_pages}</span><Button size="sm" variant="secondary" aria-label="Next page" disabled={!audit.data.next} onClick={() => setPage((value) => value + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button></div> : null}
    </Card>
  </main>;
}
