"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, RefreshCw } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/src/components/admin/AdminPageHeader";
import { Pagination } from "@/src/components/admin/Pagination";
import { SearchInput } from "@/src/components/admin/SearchInput";
import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/src/components/admin/Table";
import { Button, Input, Select, StatusBadge } from "@/src/components/ui";
import { paymentsApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import type { SubscriptionStatus } from "@/src/types";

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const subscriptions = useQuery({ queryKey: ["subscriptions", "admin", page, status, search], queryFn: () => paymentsApi.listAdminSubscriptions({ page, status: status || undefined, search: search || undefined }) });
  const action = useMutation({ mutationFn: ({ id, action, kilos }: { id: number; action: Parameters<typeof paymentsApi.manageSubscription>[1]["action"]; kilos?: number }) => paymentsApi.manageSubscription(id, { action, kilos }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriptions", "admin"] }) });

  return <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
    <AdminPageHeader title="Subscriptions" description="Activate plans after payment, manage remaining kilos, and renew or pause access." />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><SearchInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Customer name or phone" className="sm:max-w-xs" /><Select value={status} onChange={(event) => { setStatus(event.target.value as SubscriptionStatus | ""); setPage(1); }} className="sm:w-44" aria-label="Filter subscription status"><option value="">All statuses</option>{["PENDING", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"].map((item) => <option key={item}>{item}</option>)}</Select></div>
    {(subscriptions.error || action.error) ? <p className="mb-3 text-sm text-status-cancelled-text">{getApiErrorMessage(subscriptions.error || action.error)}</p> : null}
    <TableContainer><THead><Th>Customer</Th><Th>Plan</Th><Th align="right">Kilos left</Th><Th>Period</Th><Th>Status</Th><Th align="right">Actions</Th></THead><TBody>
      {subscriptions.isLoading ? <TableSkeleton columns={6} /> : null}
      {!subscriptions.isLoading && !subscriptions.data?.results.length ? <TableEmptyRow colSpan={6}><span className="inline-flex items-center gap-2"><BadgePercent className="h-4 w-4" /> No subscriptions match.</span></TableEmptyRow> : null}
      {subscriptions.data?.results.map((subscription) => <Tr key={subscription.id}>
        <Td><p className="font-medium">{subscription.customer_name || `Customer #${subscription.user}`}</p><p className="text-xs text-ink-muted">{subscription.customer_phone}</p></Td>
        <Td>{subscription.plan}</Td><Td align="right" className="tabular-nums">{Number(subscription.kg_remaining).toFixed(1)} kg</Td>
        <Td className="whitespace-nowrap text-xs text-ink-muted">{subscription.start_date} → {subscription.end_date}</Td><Td><StatusBadge label={subscription.status} tone={subscription.status === "ACTIVE" ? "ready" : subscription.status === "PENDING" ? "pending" : "progress"} /></Td>
        <Td align="right"><div className="flex flex-wrap justify-end gap-1.5">
          {subscription.status === "PENDING" ? <Button size="sm" onClick={() => action.mutate({ id: subscription.id, action: "activate" })}>Activate</Button> : null}
          {subscription.status === "ACTIVE" ? <Button size="sm" variant="secondary" onClick={() => action.mutate({ id: subscription.id, action: "pause" })}>Pause</Button> : null}
          {subscription.status === "PAUSED" ? <Button size="sm" onClick={() => action.mutate({ id: subscription.id, action: "resume" })}>Resume</Button> : null}
          <Button size="sm" variant="ghost" aria-label="Renew subscription" onClick={() => action.mutate({ id: subscription.id, action: "renew" })}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Input className="w-20 py-1 text-xs" type="number" min="0" step="0.1" defaultValue={subscription.kg_remaining} aria-label="Remaining kilos" onBlur={(event) => { if (event.target.value !== subscription.kg_remaining) action.mutate({ id: subscription.id, action: "adjust_kilos", kilos: Number(event.target.value) }); }} />
        </div></Td>
      </Tr>)}
    </TBody></TableContainer>
    {subscriptions.data ? <Pagination currentPage={subscriptions.data.current_page} numPages={subscriptions.data.num_pages} onPageChange={setPage} /> : null}
  </main>;
}
