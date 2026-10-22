"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  Boxes,
  MessageCircle,
  Package,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";

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
import { KpiTile, type KpiAccent } from "@/src/components/dashboard/KpiTile";
import { RevenueChart } from "@/src/components/finance/RevenueChart";
import { Card, StatusBadge, orderStatusTone } from "@/src/components/ui";
import {
  canAccess,
  type AdminPermission,
  ROLE_LABELS,
  type AdminRole,
} from "@/src/lib/admin-rbac";
import { chatApi, financeApi, ordersApi } from "@/src/lib/api";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { useI18n } from "@/src/i18n/I18nProvider";

const ACTIONS: {
  href: string;
  label: string;
  detail: string;
  icon: typeof Package;
  permission: AdminPermission;
  accent: string;
}[] = [
  {
    href: "/admin/quick-sale",
    label: "Create quick sale",
    detail: "Record a walk-in order",
    icon: ShoppingBag,
    permission: "sales.create",
    accent:
      "bg-gold-50 text-gold-600 group-hover:bg-gold group-hover:text-navy",
  },
  {
    href: "/admin/orders",
    label: "Manage orders",
    detail: "Review and update fulfilment",
    icon: Package,
    permission: "orders.view",
    accent:
      "bg-dashboard-blue-50 text-dashboard-blue group-hover:bg-dashboard-blue group-hover:text-white",
  },
  {
    href: "/admin/customers",
    label: "Find a customer",
    detail: "View history and loyalty",
    icon: Users,
    permission: "customers.view",
    accent:
      "bg-turquoise-50 text-turquoise-600 group-hover:bg-turquoise group-hover:text-white",
  },
  {
    href: "/admin/inventory",
    label: "Check inventory",
    detail: "Review stock and alerts",
    icon: Boxes,
    permission: "inventory.view",
    accent:
      "bg-coral-50 text-coral-600 group-hover:bg-coral group-hover:text-white",
  },
];

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default function AdminOverviewPage() {
  const { locale, t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.staff_permissions ?? [];
  const canSeeFinance = canAccess(permissions, "finance.view");
  const canSeeChat = canAccess(permissions, "chat.manage");
  const today = new Date().toISOString().slice(0, 10);
  const start = isoDaysAgo(13);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.orders.list(1),
    queryFn: () => ordersApi.listOrders(1),
  });
  const { data: chatRooms, isLoading: chatLoading } = useQuery({
    queryKey: queryKeys.chat.rooms,
    queryFn: () => chatApi.listChatRooms(),
    enabled: canSeeChat,
  });
  const { data: todaySummary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.finance.analytics.summary({ start: today, end: today }),
    queryFn: () => financeApi.getFinanceSummary({ start: today, end: today }),
    enabled: canSeeFinance,
  });
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: queryKeys.finance.analytics.revenue({
      period: "daily",
      start,
      end: today,
    }),
    queryFn: () =>
      financeApi.getRevenueAnalytics({ period: "daily", start, end: today }),
    enabled: canSeeFinance,
  });

  const openRooms =
    chatRooms?.filter((room) => room.status === "OPEN").length ?? 0;
  const unassigned =
    chatRooms?.filter((room) => room.status === "OPEN" && room.agent === null)
      .length ?? 0;
  const recentOrders = orders?.results.slice(0, 6);
  const name = user?.first_name || "there";
  const role = user?.staff_role as AdminRole | null | undefined;
  const visibleActions = ACTIONS.filter((action) =>
    canAccess(permissions, action.permission),
  );

  return (
    <main className="mx-auto max-w-[1540px] px-4 pb-8 pt-7 sm:px-7 lg:px-10 lg:pb-12 lg:pt-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600 ring-1 ring-gold/20">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {t("adminDashboard.overview")}
            </span>
          </p>
          <h1 className="font-display text-[2rem] font-light leading-[1.1] tracking-[-0.035em] text-ink sm:text-[2.6rem]">
            {t("adminDashboard.greeting")},{" "}
            <span className="bg-gradient-to-r from-gold-600 to-gold bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
            {t("adminDashboard.live")} {" "}
            {new Date().toLocaleDateString(locale, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border-0 bg-white px-4 py-2 text-xs text-ink-muted shadow-float">
          <span className="h-2 w-2 rounded-full bg-clothesline" />
          {t("adminDashboard.signedIn")} {" "}
          <strong className="font-semibold text-navy">
            {role ? t(`adminCommon.roles.${role.toLowerCase()}`) : t("common.staff")}
          </strong>
        </div>
      </header>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Key performance indicators"
      >
        <KpiTile
          accent="blue"
          icon={PackageCheck}
          label={t("adminDashboard.ordersSystem")}
          value={ordersLoading ? "—" : (orders?.count ?? 0)}
          detail={t("adminDashboard.recorded")}
        />
        <KpiTile
          accent="green"
          icon={Banknote}
          label={canSeeFinance ? t("adminDashboard.revenueToday") : t("adminDashboard.paymentAccess")}
          value={
            canSeeFinance
              ? summaryLoading
                ? "—"
                : formatCurrency(todaySummary?.revenue ?? 0)
              : t("adminDashboard.limited")
          }
          detail={t("adminDashboard.successful")}
        />
        <KpiTile
          accent="turquoise"
          icon={TrendingUp}
          label={canSeeFinance ? t("adminDashboard.average") : t("adminDashboard.currentRole")}
          value={
            canSeeFinance
              ? summaryLoading
                ? "—"
                : formatCurrency(todaySummary?.average_payment ?? 0)
              : role
                ? t(`adminCommon.roles.${role.toLowerCase()}`)
                : t("common.staff")
          }
          detail={t("adminDashboard.transaction")}
        />
        <KpiTile
          accent="coral"
          icon={MessageCircle}
          label={t("adminDashboard.unassigned")}
          value={canSeeChat ? (chatLoading ? "—" : unassigned) : t("adminDashboard.limited")}
          detail={openRooms ? `${openRooms} ${t("adminDashboard.openConversations")}` : t("adminDashboard.inboxClear")}
        />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Card className="rounded-[22px] border-0 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-clothesline-50 text-clothesline-600">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-medium text-ink">
                  {t("adminDashboard.revenueTrend")}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {t("adminDashboard.revenueBody")}
                </p>
              </div>
            </div>
            {canSeeFinance && (
              <Link
                href="/admin/analytics"
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-navy shadow-sm ring-1 ring-crease transition-colors hover:bg-navy hover:text-white"
              >
                {t("adminDashboard.report")}
              </Link>
            )}
          </div>
          {!canSeeFinance ? (
            <div className="grid h-64 place-items-center rounded-lg border border-dashed border-crease bg-mist px-6 text-center text-sm text-ink-muted">
              {t("adminDashboard.financeRestricted")}
            </div>
          ) : revenueLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-steam" />
          ) : revenue ? (
            <RevenueChart points={revenue.results} period="daily" />
          ) : null}
        </Card>

        <Card className="rounded-[22px] border-0 bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-medium text-ink">
            {t("adminDashboard.actions")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {t("adminDashboard.shortcuts")}
          </p>
          <div className="mt-4 divide-y divide-crease">
            {visibleActions.map(
              ({ href, label, detail, icon: Icon, accent }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${accent}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {t(({ "Create quick sale": "adminDashboard.createSale", "Manage orders": "adminDashboard.manageOrders", "Find a customer": "adminDashboard.findCustomer", "Check inventory": "adminDashboard.checkInventory" } as Record<string, string>)[label] ?? label)}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {t(({ "Record a walk-in order": "adminDashboard.createSaleBody", "Review and update fulfilment": "adminDashboard.manageOrdersBody", "View history and loyalty": "adminDashboard.findCustomerBody", "Review stock and alerts": "adminDashboard.checkInventoryBody" } as Record<string, string>)[detail] ?? detail)}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-navy" />
                </Link>
              ),
            )}
          </div>
          {canSeeChat && openRooms > 0 && (
            <div className="mt-5 rounded-xl bg-gradient-to-r from-gold-50 to-white p-3.5 text-xs text-gold-600 ring-1 ring-gold/25">
              <strong>
                {openRooms}{" "}
                {openRooms === 1
                  ? t("adminDashboard.conversationSingular")
                  : t("adminDashboard.conversationPlural")}
              </strong>{" "}
              {t("adminDashboard.openRoomsAlert")}
            </div>
          )}
        </Card>
      </div>

      <section className="mt-5 overflow-hidden rounded-[22px] border-0 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-crease bg-gradient-to-r from-dashboard-blue-50/70 to-transparent px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-navy">
              {t("adminDashboard.recent")}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              {t("adminDashboard.recentBody")}
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-navy hover:underline"
          >
            {t("adminDashboard.allOrders")}
          </Link>
        </div>
        <TableContainer className="border-0 shadow-none">
          <THead>
            <Th>{t("adminDashboard.order")}</Th>
            <Th>{t("adminDashboard.placed")}</Th>
            <Th align="right">{t("adminDashboard.total")}</Th>
            <Th>{t("adminDashboard.status")}</Th>
          </THead>
          <TBody>
            {ordersLoading && <TableSkeleton columns={4} rows={6} />}
            {!ordersLoading && !recentOrders?.length && (
              <TableEmptyRow colSpan={4}>{t("adminDashboard.noOrders")}</TableEmptyRow>
            )}
            {recentOrders?.map((order) => (
              <Tr key={order.id}>
                <Td className="font-medium">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-navy hover:underline"
                  >
                    #{order.id}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-muted">
                  {new Date(order.created_at).toLocaleDateString(locale)}
                </Td>
                <Td align="right" className="tabular-nums">
                  {formatCurrency(order.total_amount)}
                </Td>
                <Td>
                  <StatusBadge
                    label={order.status}
                    tone={orderStatusTone(order.status)}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </TableContainer>
      </section>
    </main>
  );
}
