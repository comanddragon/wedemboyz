"use client";

import { useQuery } from "@tanstack/react-query";
import { Boxes, MessageCircle, Package, ShoppingBag, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import Link from "next/link";

import { TableContainer, TableEmptyRow, TableSkeleton, TBody, Td, Th, THead, Tr } from "@/components/admin/Table";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, EyebrowLabel, StatusBadge, orderStatusTone, paymentStatusTone } from "@/components/ui";
import { chatApi, financeApi, ordersApi, paymentsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";

const SECTIONS = [
    { href: "/admin/quick-sale", label: "Quick sale", description: "Record a walk-in sale on the spot.", icon: ShoppingBag },
    { href: "/admin/orders", label: "Orders", description: "Track and update every order's status.", icon: Package },
    { href: "/admin/payments", label: "Payments", description: "Payments, refunds, and invoices.", icon: Wallet },
    { href: "/admin/inventory", label: "Inventory", description: "Stock levels and low-stock alerts.", icon: Boxes },
    { href: "/admin/chat", label: "Chat inbox", description: "Jump into open customer conversations.", icon: MessageCircle },
    { href: "/admin/customers", label: "Customers", description: "Directory, order history, and loyalty tier.", icon: Users },
];

/** Today, as an ISO date — used to scope the finance summary to "today". */
function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

export default function AdminOverviewPage() {
    const today = todayIsoDate();

    const { data: orders, isLoading: ordersLoading } = useQuery({
        queryKey: queryKeys.orders.list(1),
        queryFn: () => ordersApi.listOrders(1),
    });

    const { data: payments, isLoading: paymentsLoading } = useQuery({
        queryKey: queryKeys.payments.list(1),
        queryFn: () => paymentsApi.listPayments(1),
    });

    const { data: chatRooms, isLoading: chatLoading } = useQuery({
        queryKey: queryKeys.chat.rooms,
        queryFn: () => chatApi.listChatRooms(),
    });

    // The one real aggregate on this page — revenue/profit here are computed
    // server-side across every matching payment, not just page 1, so unlike
    // the old "active orders" / "pending payments" cards these numbers are
    // exact, not an approximation. See financeApi.getFinanceSummary.
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: queryKeys.finance.analytics.summary({ start: today, end: today }),
        queryFn: () => financeApi.getFinanceSummary({ start: today, end: today }),
    });

    const isLoading = ordersLoading || paymentsLoading || chatLoading;

    const openRooms = chatRooms?.filter((r) => r.status === "OPEN").length ?? 0;
    const unassignedRooms = chatRooms?.filter((r) => r.status === "OPEN" && r.agent === null).length ?? 0;

    const recentOrders = orders?.results.slice(0, 5);
    const recentPayments = payments?.results.slice(0, 5);

    const profitIsNegative = (summary?.profit ?? 0) < 0;

    return (
        <main className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
            <EyebrowLabel words={["Staff admin"]} />
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy">Overview</h1>
            <p className="mt-1 text-sm text-ink-muted">
                Today&apos;s revenue and profit are exact, server-side totals. For other periods and expense breakdowns, see{" "}
                <Link href="/admin/analytics" className="font-medium text-navy hover:underline">
                    Analytics
                </Link>
                .
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Package} label="Total orders" value={ordersLoading ? "—" : (orders?.count ?? "—")} />
                <StatCard
                    icon={Wallet}
                    label="Revenue today"
                    value={summaryLoading ? "—" : formatCurrency(summary?.revenue ?? 0)}
                    accent="gold"
                />
                <StatCard
                    icon={profitIsNegative ? TrendingDown : TrendingUp}
                    label="Profit today"
                    value={summaryLoading ? "—" : formatCurrency(summary?.profit ?? 0)}
                    accent={profitIsNegative ? "gold" : "navy"}
                />
                <Link href="/admin/chat">
                    <StatCard
                        icon={MessageCircle}
                        label="Unassigned chats"
                        value={isLoading ? "—" : unassignedRooms}
                        accent={unassignedRooms > 0 ? "gold" : "navy"}
                    />
                </Link>
            </div>

            {!isLoading && openRooms > 0 && (
                <p className="mt-3 text-xs text-ink-muted">{openRooms} open chat room{openRooms === 1 ? "" : "s"} in total.</p>
            )}
            {!summaryLoading && summary && (
                <p className="mt-1 text-xs text-ink-muted">
                    {summary.payment_count} payment{summary.payment_count === 1 ? "" : "s"} today · avg{" "}
                    {formatCurrency(summary.average_payment)}
                </p>
            )}

            <div className="mt-10 flex items-center justify-between">
                <h2 className="font-display text-sm font-medium text-ink">Recent orders</h2>
                <Link href="/admin/orders" className="text-xs font-medium text-navy hover:underline">
                    View all
                </Link>
            </div>
            <div className="mt-3">
                <TableContainer>
                    <THead>
                        <Th>Order</Th>
                        <Th>Placed</Th>
                        <Th align="right">Total</Th>
                        <Th>Status</Th>
                    </THead>
                    <TBody>
                        {ordersLoading && <TableSkeleton columns={4} rows={5} />}
                        {!ordersLoading && recentOrders && recentOrders.length === 0 && (
                            <TableEmptyRow colSpan={4}>No orders yet.</TableEmptyRow>
                        )}
                        {!ordersLoading &&
                            recentOrders?.map((order) => (
                                <Tr key={order.id}>
                                    <Td className="font-medium">
                                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                                            #{order.id}
                                        </Link>
                                    </Td>
                                    <Td className="whitespace-nowrap text-ink-muted">{new Date(order.created_at).toLocaleDateString()}</Td>
                                    <Td align="right" className="tabular-nums">
                                        {formatCurrency(order.total_amount)}
                                    </Td>
                                    <Td>
                                        <StatusBadge label={order.status} tone={orderStatusTone(order.status)} />
                                    </Td>
                                </Tr>
                            ))}
                    </TBody>
                </TableContainer>
            </div>

            <div className="mt-8 flex items-center justify-between">
                <h2 className="font-display text-sm font-medium text-ink">Recent payments</h2>
                <Link href="/admin/payments" className="text-xs font-medium text-navy hover:underline">
                    View all
                </Link>
            </div>
            <div className="mt-3">
                <TableContainer>
                    <THead>
                        <Th>Payment</Th>
                        <Th>Order</Th>
                        <Th align="right">Amount</Th>
                        <Th>Status</Th>
                    </THead>
                    <TBody>
                        {paymentsLoading && <TableSkeleton columns={4} rows={5} />}
                        {!paymentsLoading && recentPayments && recentPayments.length === 0 && (
                            <TableEmptyRow colSpan={4}>No payments yet.</TableEmptyRow>
                        )}
                        {!paymentsLoading &&
                            recentPayments?.map((payment) => (
                                <Tr key={payment.id}>
                                    <Td className="font-medium">
                                        <Link href={`/admin/payments/${payment.id}`} className="hover:underline">
                                            #{payment.id}
                                        </Link>
                                    </Td>
                                    <Td className="text-ink-muted">#{payment.order}</Td>
                                    <Td align="right" className="tabular-nums">
                                        {formatCurrency(payment.amount)}
                                    </Td>
                                    <Td>
                                        <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
                                    </Td>
                                </Tr>
                            ))}
                    </TBody>
                </TableContainer>
            </div>

            <h2 className="font-display mb-3 mt-10 text-sm font-medium text-ink">Sections</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SECTIONS.map((section) => (
                    <Link key={section.href} href={section.href}>
                        <Card className="flex items-start gap-3 transition-colors hover:bg-steam">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steam text-navy">
                <section.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
                            <div>
                                <p className="text-sm font-medium text-ink">{section.label}</p>
                                <p className="mt-0.5 text-xs text-ink-muted">{section.description}</p>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </main>
    );
}