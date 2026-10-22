"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  PackageCheck,
  Save,
  Shirt,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useI18n } from "@/src/i18n/I18nProvider";
import { useState } from "react";

import {
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/src/components/admin/Table";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { PaymentSummary } from "@/src/components/payments/PaymentSummary";
import { PaymentMethodIcon } from "@/src/components/payments/PaymentMethodIcon";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  ServiceIcon,
  StatusBadge,
  Textarea,
  orderStatusTone,
  paymentStatusTone,
  serviceLabel,
} from "@/src/components/ui";
import { ordersApi, paymentsApi, scheduleApi, staffApi } from "@/src/lib/api";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { formatCurrency } from "@/src/lib/constants";
import { queryKeys } from "@/src/lib/query-keys";
import { customerFullName } from "@/src/lib/utils";
import type { OrderItem, OrderStatus, PaymentMethodType } from "@/src/types";

const PAYMENT_METHODS: Array<{ value: PaymentMethodType; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "MTN_MOMO", label: "MTN Mobile Money" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const ITEM_STATUSES: OrderItem["status"][] = [
  "RECEIVED",
  "WASHED",
  "PRESSED",
  "PACKED",
];

export default function AdminOrderDetailPage() {
  const { locale, t } = useI18n();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const queryClient = useQueryClient();

  const paymentMethods: Array<{ value: PaymentMethodType; label: string }> = [
    { value: "CASH", label: t("adminFinance.cash") },
    { value: "MTN_MOMO", label: "MTN Mobile Money" },
    { value: "ORANGE_MONEY", label: "Orange Money" },
    { value: "BANK_TRANSFER", label: t("adminFinance.transfer") },
    { value: "OTHER", label: t("adminFinance.other") },
  ];

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
  });

  const [note, setNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const paymentsQuery = useQuery({
    queryKey: ["orders", orderId, "payments"],
    queryFn: () => paymentsApi.listOrderPayments(orderId),
  });

  const staffQuery = useQuery({
    queryKey: ["staff", "operations"],
    queryFn: () => staffApi.listOperationalStaff(),
  });

  const scheduleQuery = useQuery({
    queryKey: ["schedule", orderId],
    queryFn: () => scheduleApi.getSchedule(orderId),
    enabled: Boolean(order?.has_schedule),
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: OrderStatus) =>
      ordersApi.updateOrderStatus(orderId, {
        status: nextStatus,
        note: note || undefined,
        allow_unpaid_delivery:
          nextStatus === "DELIVERED" && Number(order?.balance_due ?? 0) > 0,
      }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: (input: {
      assigned_to: number | null;
      driver: number | null;
    }) => ordersApi.assignOrder(orderId, input),
    onSuccess: (updated) =>
      queryClient.setQueryData(queryKeys.orders.detail(orderId), updated),
  });

  const itemMutation = useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: number;
      input: Parameters<typeof ordersApi.updateOrderItem>[2];
    }) => ordersApi.updateOrderItem(orderId, itemId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      }),
  });

  const detailsMutation = useMutation({
    mutationFn: (input: Parameters<typeof ordersApi.updateOrder>[1]) =>
      ordersApi.updateOrder(orderId, input),
    onSuccess: (updated) =>
      queryClient.setQueryData(queryKeys.orders.detail(orderId), updated),
  });

  const scheduleMutation = useMutation({
    mutationFn: (input: Parameters<typeof scheduleApi.createSchedule>[0]) =>
      order?.has_schedule
        ? scheduleApi.updateSchedule(orderId, input)
        : scheduleApi.createSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule", orderId] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      paymentsApi.recordOrderPayment(orderId, {
        amount: paymentAmount,
        payment_method_type: paymentMethod,
        reference: paymentReference,
      }),
    onSuccess: () => {
      setPaymentAmount("");
      setPaymentReference("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      });
      queryClient.invalidateQueries({
        queryKey: ["orders", orderId, "payments"],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9 text-sm text-ink-muted">
        {t("adminCommon.loading")}
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <p className="text-sm text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("adminOrders.backToOrders")}
      </Link>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <CustomerAvatar
            name={customerFullName(order.customer) ?? `Customer ${order.user}`}
            size="lg"
            imageUrl={order.customer?.avatar}
            useProfilePhoto={order.customer?.use_profile_photo}
          />
          <div>
            <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
              {order.ticket_number ?? `Order #${order.id}`}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {customerFullName(order.customer) ?? `Customer #${order.user}`} ·
              {" "}{t("adminOrders.colPlaced").toLowerCase()} {new Date(order.created_at).toLocaleString(locale)}
            </p>
          </div>
        </div>
        <StatusBadge
          label={order.status}
          tone={orderStatusTone(order.status)}
        />
      </div>

      <section
        className="mb-6 grid overflow-hidden rounded-2xl border border-crease bg-white sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Order overview"
      >
        {[
          {
            icon: Shirt,
            label: t("adminOrders.laundryLoad"),
            value: `${order.pieces_count} ${t("adminOrders.pc")} · ${Number(order.weight_kg_total).toFixed(1)} kg`,
          },
          {
            icon: WalletCards,
            label: t("adminOrders.colPayment"),
            value: `${formatCurrency(order.balance_due)} ${t("adminOrders.due")}`,
          },
          {
            icon: UserRound,
            label: t("adminOrders.colCustomer"),
            value:
              customerFullName(order.customer) ?? `Customer #${order.user}`,
          },
          {
            icon: CalendarDays,
            label: t("adminOrders.priorityAndSource"),
            value: `${order.priority} · ${order.source.replace(/_/g, " ")}`,
          },
        ].map(({ icon: Icon, label, value }, index) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-5 py-4 ${index ? "border-t border-crease sm:border-l sm:border-t-0 sm:[&:nth-child(3)]:border-l-0 sm:[&:nth-child(3)]:border-t xl:[&:nth-child(3)]:border-l xl:[&:nth-child(3)]:border-t-0" : ""}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50 text-navy">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-muted">{label}</p>
              <p className="truncate text-sm font-semibold text-navy">
                {value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-crease bg-steam/30 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-navy">
                  {t("adminOrders.itemsInOrder")}
                </h2>
                <p className="text-xs text-ink-muted">
                  {t("adminOrders.itemsDescription")}
                </p>
              </div>
              <PackageCheck className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    {t("adminOrders.pickup")}
                  </p>
                  <p className="text-ink">
                    {order.pickup_address || t("adminOrders.notProvided")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Truck
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    {t("adminOrders.delivery")}
                  </p>
                  <p className="text-ink">
                    {order.delivery_address || t("adminOrders.notProvided")}
                  </p>
                </div>
              </div>
            </div>
            {order.notes && (
              <div className="mt-4 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-600">
                <span className="font-semibold">{t("adminOrders.customerNote")}:</span>{" "}
                {order.notes}
              </div>
            )}
          </div>

          <TableContainer className="rounded-none border-x-0 border-b-0">
            <THead>
              <Th>{t("adminOrders.colOrder")}</Th>
              <Th>{t("adminOrders.service")}</Th>
              <Th>{t("adminOrders.progress")}</Th>
              <Th align="right">{t("adminOrders.weight")}</Th>
              <Th align="right">{t("adminOrders.qty")}</Th>
              <Th align="right">{t("adminOrders.subtotal")}</Th>
            </THead>
            <TBody>
              {order.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <div className="flex items-start gap-2">
                      {(item.photos[0]?.image ?? item.photo) ? (
                        <a
                          href={item.photos[0]?.image ?? item.photo ?? ""}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-steam"
                        >
                          <Image
                            src={item.photos[0]?.image ?? item.photo ?? ""}
                            alt={item.label || serviceLabel(item.service_type)}
                            fill
                            unoptimized
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          {item.photos.length > 1 ? (
                            <span className="absolute bottom-1 right-1 rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">
                              +{item.photos.length - 1}
                            </span>
                          ) : null}
                        </a>
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy">
                          <ServiceIcon type={item.service_type} />
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-ink">
                          {item.label || serviceLabel(item.service_type)}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {item.description}
                          </p>
                        )}
                        {(item.condition_notes || item.stain_notes) && (
                          <p className="mt-1 text-xs font-medium text-status-progress-text">
                            {[item.condition_notes, item.stain_notes]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-ink-muted">
                    {serviceLabel(item.service_type)}
                  </Td>
                  <Td>
                    <Select
                      value={item.status}
                      className="min-w-28 py-1 text-xs"
                      aria-label={`Progress for ${item.label || serviceLabel(item.service_type)}`}
                      onChange={(event) =>
                        itemMutation.mutate({
                          itemId: item.id,
                          input: {
                            status: event.target.value as OrderItem["status"],
                          },
                        })
                      }
                      disabled={itemMutation.isPending}
                    >
                      {ITEM_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      defaultValue={item.weight_kg ?? ""}
                      placeholder="—"
                      className="ml-auto w-20 py-1 text-right text-xs"
                      aria-label={`Weight for ${item.label || serviceLabel(item.service_type)}`}
                      onBlur={(event) => {
                        const value = event.target.value;
                        if (value !== (item.weight_kg ?? ""))
                          itemMutation.mutate({
                            itemId: item.id,
                            input: { weight_kg: value ? Number(value) : null },
                          });
                      }}
                    />
                  </Td>
                  <Td align="right" className="tabular-nums text-ink-muted">
                    {item.quantity}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </TableContainer>

          <div className="space-y-1 p-5 pt-4 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>{t("adminOrders.subtotal")}</span>
              <span className="tabular-nums">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("adminOrders.discount")}</span>
              <span className="tabular-nums">
                -{formatCurrency(order.discount_amount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>{t("adminOrders.deliveryFee")}</span>
              <span className="tabular-nums">
                {formatCurrency(order.delivery_fee)}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-navy">
              <span>{t("adminOrders.total")}</span>
              <span className="tabular-nums">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-navy">
              {t("adminOrders.operations")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("adminOrders.assignedStaff")} htmlFor="assigned-staff">
                <Select
                  id="assigned-staff"
                  value={order.assigned_to ?? ""}
                  disabled={assignmentMutation.isPending}
                  onChange={(event) =>
                    assignmentMutation.mutate({
                      assigned_to: event.target.value
                        ? Number(event.target.value)
                        : null,
                      driver: order.driver,
                    })
                  }
                >
                  <option value="">{t("adminOrders.unassigned")}</option>
                  {staffQuery.data?.map((profile) => (
                    <option key={profile.id} value={profile.user.id}>
                      {profile.user.first_name} {profile.user.last_name} ·{" "}
                      {profile.role}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("adminOrders.driver")} htmlFor="order-driver">
                <Select
                  id="order-driver"
                  value={order.driver ?? ""}
                  disabled={assignmentMutation.isPending}
                  onChange={(event) =>
                    assignmentMutation.mutate({
                      assigned_to: order.assigned_to,
                      driver: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                >
                  <option value="">{t("adminOrders.noDriver")}</option>
                  {staffQuery.data
                    ?.filter((profile) => profile.role === "DRIVER")
                    .map((profile) => (
                      <option key={profile.id} value={profile.user.id}>
                        {profile.user.first_name} {profile.user.last_name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <form
              key={`${order.updated_at}-${order.assigned_to}-${order.driver}`}
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px_auto] sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                detailsMutation.mutate({
                  internal_notes: String(data.get("internal_notes") ?? ""),
                  tag_number: String(data.get("tag_number") ?? ""),
                  priority: String(data.get("priority")) as
                    "NORMAL" | "EXPRESS" | "URGENT",
                  is_express: data.get("priority") !== "NORMAL",
                });
              }}
            >
              <Field label={t("adminOrders.internalNotes")} htmlFor="internal-notes">
                <Input
                  id="internal-notes"
                  name="internal_notes"
                  defaultValue={order.internal_notes}
                  placeholder={t("adminOrders.tagPlaceholder")}
                />
              </Field>
              <Field label={t("adminOrders.tag")} htmlFor="tag-number">
                <Input
                  id="tag-number"
                  name="tag_number"
                  defaultValue={order.tag_number}
                />
              </Field>
              <div className="flex gap-2">
                <Select
                  name="priority"
                  defaultValue={order.priority}
                  aria-label="Order priority"
                  className="w-28"
                >
                  <option value="NORMAL">{t("adminOrders.priorityNormal")}</option>
                  <option value="EXPRESS">{t("adminOrders.priorityExpress")}</option>
                  <option value="URGENT">{t("adminOrders.priorityUrgent")}</option>
                </Select>
                <Button
                  type="submit"
                  size="sm"
                  aria-label={t("adminOrders.saveOperations")}
                  disabled={detailsMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </form>
            {(assignmentMutation.error ||
              detailsMutation.error ||
              itemMutation.error) && (
              <p className="mt-2 text-xs text-status-cancelled-text">
                {getApiErrorMessage(
                  assignmentMutation.error ||
                    detailsMutation.error ||
                    itemMutation.error,
                )}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-navy">
              {t("adminOrders.pickupAndDelivery")}
            </h2>
            <form
              key={
                scheduleQuery.data
                  ? `${scheduleQuery.data.pickup_date}-${scheduleQuery.data.delivery_date}-${scheduleQuery.data.pickup_time_slot}-${scheduleQuery.data.delivery_time_slot}`
                  : "new-schedule"
              }
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                scheduleMutation.mutate({
                  order: orderId,
                  pickup_date: String(data.get("pickup_date")),
                  pickup_time_slot: String(data.get("pickup_time_slot")) as
                    "MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING",
                  delivery_date: String(data.get("delivery_date")),
                  delivery_time_slot: String(data.get("delivery_time_slot")) as
                    "MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING",
                  driver: order.driver,
                  contact_phone: String(data.get("contact_phone") ?? ""),
                  address_override: String(data.get("address_override") ?? ""),
                });
              }}
            >
              <Field label={t("adminOrders.pickupDate")} htmlFor="pickup-date">
                <Input
                  id="pickup-date"
                  name="pickup_date"
                  type="date"
                  required
                  defaultValue={scheduleQuery.data?.pickup_date}
                />
              </Field>
              <Field label={t("adminOrders.pickupWindow")} htmlFor="pickup-slot">
                <Select
                  id="pickup-slot"
                  name="pickup_time_slot"
                  defaultValue={
                    scheduleQuery.data?.pickup_time_slot ?? "MORNING"
                  }
                >
                  {["MORNING", "MIDDAY", "AFTERNOON", "EVENING"].map((slot) => (
                    <option key={slot}>{slot}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("adminOrders.deliveryDate")} htmlFor="delivery-date">
                <Input
                  id="delivery-date"
                  name="delivery_date"
                  type="date"
                  required
                  defaultValue={scheduleQuery.data?.delivery_date}
                />
              </Field>
              <Field label={t("adminOrders.deliveryWindow")} htmlFor="delivery-slot">
                <Select
                  id="delivery-slot"
                  name="delivery_time_slot"
                  defaultValue={
                    scheduleQuery.data?.delivery_time_slot ?? "AFTERNOON"
                  }
                >
                  {["MORNING", "MIDDAY", "AFTERNOON", "EVENING"].map((slot) => (
                    <option key={slot}>{slot}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("adminOrders.contactPhone")} htmlFor="schedule-phone">
                <Input
                  id="schedule-phone"
                  name="contact_phone"
                  defaultValue={scheduleQuery.data?.contact_phone}
                />
              </Field>
              <Field label={t("adminOrders.addressOverride")} htmlFor="schedule-address">
                <Input
                  id="schedule-address"
                  name="address_override"
                  defaultValue={scheduleQuery.data?.address_override}
                  placeholder={t("adminOrders.useOrderAddress")}
                />
              </Field>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Button
                  size="sm"
                  type="submit"
                  disabled={scheduleMutation.isPending}
                >
                  {order.has_schedule ? t("adminOrders.saveSchedule") : t("adminOrders.createSchedule")}
                </Button>
                {scheduleQuery.data && (
                  <span className="text-xs text-ink-muted">
                    {t("adminOrders.pickup")} {scheduleQuery.data.pickup_status.toLowerCase()} ·
                    {" "}{t("adminOrders.delivery")} {scheduleQuery.data.delivery_status.toLowerCase()}
                  </span>
                )}
              </div>
            </form>
            {scheduleMutation.error && (
              <p className="mt-2 text-xs text-status-cancelled-text">
                {getApiErrorMessage(scheduleMutation.error)}
              </p>
            )}
          </Card>

          <Card>
            <PaymentSummary
              status={order.payment_status}
              total={order.total_amount}
              paid={order.amount_paid}
              balance={order.balance_due}
            />

            {!(["PAID", "NO_CHARGE", "WAIVED", "VOID"] as string[]).includes(
              order.payment_status,
            ) && (
              <form
                className="mt-5 border-t border-crease pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  paymentMutation.mutate();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("adminOrders.amountReceived")} htmlFor="payment-amount">
                    <Input
                      id="payment-amount"
                      type="number"
                      min="1"
                      max={order.balance_due}
                      required
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      placeholder={order.balance_due}
                    />
                  </Field>
                  <Field label={t("adminOrders.method")} htmlFor="payment-method">
                    <div className="flex items-center gap-2">
                      <PaymentMethodIcon method={paymentMethod} />
                      <Select
                        id="payment-method"
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value as PaymentMethodType,
                          )
                        }
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </Field>
                </div>
                <Field
                  label={t("adminOrders.reference")}
                  htmlFor="payment-reference"
                  hint={t("adminOrders.referenceHint")}
                >
                  <Input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(event.target.value)
                    }
                  />
                </Field>
                <Button
                  type="submit"
                  disabled={paymentMutation.isPending || !paymentAmount}
                >
                  {paymentMutation.isPending ? t("adminOrders.recording") : t("adminOrders.recordPayment")}
                </Button>
                {paymentMutation.error && (
                  <p className="mt-2 text-xs text-status-cancelled-text">
                    {getApiErrorMessage(paymentMutation.error)}
                  </p>
                )}
              </form>
            )}
          </Card>

          <Card className="p-0">
            <h2 className="p-5 pb-3 text-sm font-semibold text-navy">
              {t("adminOrders.paymentsReceived")}
            </h2>
            {paymentsQuery.data?.length ? (
              <div className="divide-y divide-crease">
                {paymentsQuery.data.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <PaymentMethodIcon method={payment.payment_method_type} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {payment.payment_method_type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {new Date(payment.received_at).toLocaleString(locale)}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-navy">
                        {formatCurrency(payment.amount)}
                      </p>
                      {payment.voided_at && (
                        <StatusBadge
                          label={t("adminOrders.voided")}
                          tone={paymentStatusTone("VOID")}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-ink-muted">
                {t("adminOrders.noPaymentRecorded")}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-navy">
              {t("adminOrders.moveForward")}
            </h2>
            {NEXT_STATUSES[order.status].length ? (
              <>
                <Field
                  label={
                    NEXT_STATUSES[order.status].includes("CANCELLED")
                      ? t("adminOrders.statusNoteCancel")
                      : t("adminOrders.statusNote")
                  }
                  htmlFor="status-note"
                >
                  <Textarea
                    id="status-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[order.status].map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={status === "CANCELLED" ? "danger" : "primary"}
                      disabled={
                        statusMutation.isPending ||
                        (status === "CANCELLED" && !note.trim())
                      }
                      onClick={() => {
                        if (
                          status === "DELIVERED" &&
                          Number(order.balance_due) > 0 &&
                          !window.confirm(
                            `${t("adminOrders.deliverBalanceConfirm")} (${formatCurrency(order.balance_due)})`,
                          )
                        )
                          return;
                        statusMutation.mutate(status);
                      }}
                    >
                      {status === "OUT_FOR_DELIVERY" ? (
                        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {status.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                {t("adminOrders.noFurtherActions")}
              </p>
            )}
            {statusMutation.error && (
              <p className="mt-2 text-sm text-status-cancelled-text">
                {getApiErrorMessage(statusMutation.error)}
              </p>
            )}
          </Card>

          <Card className="p-0">
            <h2 className="font-display p-5 pb-3 text-sm font-medium text-ink">
              {t("adminOrders.statusHistory")}
            </h2>
            {order.status_history.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-ink-muted">
                {t("adminOrders.noStatusChanges")}
              </p>
            ) : (
              <TableContainer className="rounded-none border-x-0 border-b-0">
                <THead>
                  <Th>{t("adminOrders.colStatus")}</Th>
                  <Th>{t("adminOrders.changedBy")}</Th>
                  <Th>{t("adminOrders.note")}</Th>
                  <Th align="right">{t("adminOrders.when")}</Th>
                </THead>
                <TBody>
                  {order.status_history.map((entry, i) => (
                    <Tr key={entry.id ?? i}>
                      <Td>
                        <StatusBadge
                          label={entry.status}
                          tone={orderStatusTone(entry.status)}
                        />
                      </Td>
                      <Td className="text-ink-muted">
                        {entry.changed_by ?? "—"}
                      </Td>
                      <Td className="text-ink-muted">{entry.note || "—"}</Td>
                      <Td
                        align="right"
                        className="whitespace-nowrap text-ink-muted"
                      >
                        {new Date(entry.created_at).toLocaleString(locale)}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </TableContainer>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
