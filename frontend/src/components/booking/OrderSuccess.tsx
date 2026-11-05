"use client";

import { CircleCheck, MessageCircle } from "lucide-react";
import { useEffect } from "react";

import { buttonStyles } from "@/src/components/ui/Button";
import { serviceLabel } from "@/src/components/ui/ServiceIcon";
import { useI18n } from "@/src/i18n/I18nProvider";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { formatCurrency } from "@/src/lib/constants";
import type { OrderDetail } from "@/src/types";

export interface CompletedBooking {
  order: OrderDetail;
  whatsappUrl: string;
  pickupDate: string | null;
  pickupSlot: string | null;
}

export function OrderSuccess({
  order,
  whatsappUrl,
  pickupDate,
  pickupSlot,
}: CompletedBooking) {
  const { locale } = useI18n();
  const fr = locale === "fr";
  const pendingWeight = order.items.some(
    (item) =>
      item.weight_kg == null &&
      ["LAVAGE_ESSORAGE", "LAVAGE_SECHAGE", "REPASSAGE_PLASTIF"].includes(
        item.service_type,
      ),
  );
  const afterWeighing = fr
    ? "Confirmé après pesée"
    : "Confirmed after weighing";

  useEffect(() => {
    // Acknowledge the saved order before the existing same-tab app handoff.
    const timer = window.setTimeout(
      () => window.location.assign(whatsappUrl),
      2000,
    );
    return () => window.clearTimeout(timer);
  }, [whatsappUrl]);

  return (
    <section
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"
      aria-labelledby="order-success-title"
    >
      <header className="text-center" role="status">
        <CircleCheck
          className="mx-auto mb-5 h-16 w-16 text-status-ready-text"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h1
          id="order-success-title"
          className="font-display text-3xl font-semibold text-navy sm:text-4xl"
        >
          {fr ? "Votre commande est passée !" : "Your order is placed!"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          {fr
            ? "Votre commande est enregistrée. WhatsApp va s’ouvrir pour envoyer les détails à notre équipe."
            : "Your order is saved. WhatsApp will open so you can send the details to our team."}
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-crease bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-crease pb-4">
          <h2 className="font-display text-lg font-semibold text-navy">
            {fr ? "Détails de la commande" : "Order details"}
          </h2>
          <span className="font-semibold text-navy">
            {order.ticket_number || `#${order.id}`}
          </span>
        </div>
        <dl className="grid gap-5 py-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">
              {fr ? "Prise en charge" : "Fulfilment"}
            </dt>
            <dd className="mt-1 font-medium text-ink">
              {order.fulfillment_type === "PICKUP"
                ? fr
                  ? "Collecte à domicile"
                  : "Pickup"
                : fr
                  ? "Dépôt en boutique"
                  : "Drop-off"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">{fr ? "Paiement" : "Payment"}</dt>
            <dd className="mt-1 font-medium text-ink">
              {order.payment_option === "PAY_AT_PICKUP"
                ? fr
                  ? "À la collecte / au dépôt"
                  : "Pay on pickup / drop-off"
                : fr
                  ? "À la livraison"
                  : "Pay on delivery"}
            </dd>
          </div>
          {order.fulfillment_type === "PICKUP" ? (
            <div>
              <dt className="text-ink-muted">
                {fr ? "Adresse de collecte" : "Pickup address"}
              </dt>
              <dd className="mt-1 break-words text-ink">
                {order.pickup_address}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-muted">
              {fr ? "Adresse de livraison" : "Delivery address"}
            </dt>
            <dd className="mt-1 break-words text-ink">
              {order.delivery_address}
            </dd>
          </div>
          {order.fulfillment_type === "PICKUP" && pickupDate && pickupSlot ? (
            <div>
              <dt className="text-ink-muted">
                {fr ? "Collecte prévue" : "Pickup schedule"}
              </dt>
              <dd className="mt-1 text-ink">
                {pickupDate} · {pickupSlot}
              </dd>
            </div>
          ) : null}
        </dl>
        <ul className="divide-y divide-crease border-y border-crease">
          {order.items.map((item) => {
            const unweighed =
              item.weight_kg == null &&
              [
                "LAVAGE_ESSORAGE",
                "LAVAGE_SECHAGE",
                "REPASSAGE_PLASTIF",
              ].includes(item.service_type);
            return (
              <li
                key={item.id}
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm"
              >
                <span className="min-w-0 break-words text-ink">
                  {item.quantity} ×{" "}
                  {item.label || serviceLabel(item.service_type)}
                  {item.weight_kg ? ` · ${item.weight_kg} kg` : ""}
                </span>
                <span className="text-ink-muted">
                  {unweighed ? afterWeighing : formatCurrency(item.subtotal)}
                </span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-ink-muted">
            <dt>{fr ? "Livraison" : "Delivery"}</dt>
            <dd>{formatCurrency(order.delivery_fee)}</dd>
          </div>
          {Number(order.discount_amount) > 0 ? (
            <div className="flex justify-between gap-4 text-ink-muted">
              <dt>{fr ? "Réduction" : "Discount"}</dt>
              <dd>−{formatCurrency(order.discount_amount)}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2 pt-2 font-semibold text-navy">
            <dt>{fr ? "Total" : "Total"}</dt>
            <dd>
              {pendingWeight
                ? afterWeighing
                : formatCurrency(order.total_amount)}
            </dd>
          </div>
        </dl>
        {order.notes ? (
          <p className="mt-5 break-words text-sm text-ink-muted">
            {fr ? "Instructions : " : "Notes: "}
            {order.notes}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href={whatsappUrl}
          className={buttonStyles({
            variant: "gold",
            className: "w-full sm:w-auto",
          })}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {fr ? "Ouvrir WhatsApp" : "Open WhatsApp"}
        </a>
        <Link
          href={`/orders/${order.id}`}
          className={buttonStyles({
            variant: "ghost",
            className: "w-full sm:w-auto",
          })}
        >
          {fr ? "Suivre ma commande" : "Track my order"}
        </Link>
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-ink-muted">
        {fr
          ? "Appuyez sur Envoyer dans WhatsApp pour partager votre commande."
          : "Tap Send in WhatsApp to share your order."}
      </p>
    </section>
  );
}
