"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useI18n } from "@/src/i18n/I18nProvider";
import { ordersApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { formatCurrency } from "@/src/lib/constants";
import {
  buttonStyles,
  Card,
  ServiceIcon,
  serviceLabel,
  StatusBadge,
} from "@/src/components/ui";
import { getApiErrorMessage } from "@/src/lib/api/errors";

export function ItemDetailPage({ admin = false }: { admin?: boolean }) {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const { locale, t } = useI18n();
  const fr = locale === "fr";
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.orders.detail(Number(id)),
    queryFn: () => ordersApi.getOrder(Number(id)),
    enabled: Number.isSafeInteger(Number(id)) && Number(id) > 0,
  });
  const item = order?.items.find((entry) => entry.id === Number(itemId));
  const title = item
    ? item.label || serviceLabel(item.service_type)
    : fr
      ? "Détails de l’article"
      : "Item details";
  const photos = item
    ? [
        ...new Set(
          [item.photo, ...item.photos.map((photo) => photo.image)].filter(
            (url): url is string => Boolean(url),
          ),
        ),
      ]
    : [];
  return (
    <main className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8 lg:px-10">
      <Link
        href={`${admin ? "/admin" : ""}/orders/${id}`}
        className={buttonStyles({ variant: "ghost", className: "mb-5" })}
      >
        ← {fr ? "Retour à la commande" : "Back to order"} #{id}
      </Link>
      <h1 className="mb-6 break-words font-display text-3xl font-semibold text-navy">
        {title}
      </h1>
      {isLoading ? (
        <p role="status">{t("orders.loading")}</p>
      ) : error ? (
        <p role="alert" className="text-status-cancelled-text">
          {getApiErrorMessage(error)}
        </p>
      ) : !item ? (
        <p>{fr ? "Article introuvable." : "Item not found."}</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section
            aria-label={fr ? "Photos de l’article" : "Item photos"}
            className="grid gap-4 sm:grid-cols-2"
          >
            {photos.length ? (
              photos.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={`relative block aspect-square overflow-hidden rounded-2xl bg-steam focus-visible:outline-2 focus-visible:outline-gold ${index === 0 ? "sm:col-span-2" : ""}`}
                  aria-label={`${fr ? "Ouvrir la photo" : "Open photo"} ${index + 1}`}
                >
                  <Image
                    src={url}
                    alt={`${title} — ${index + 1}`}
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-contain"
                  />
                </a>
              ))
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl bg-steam sm:col-span-2">
                <div className="flex flex-col items-center gap-3 text-sm text-ink-muted">
                  <ServiceIcon type={item.service_type} />
                  {fr
                    ? "Aucune photo pour cet article."
                    : "No photos for this item."}
                </div>
              </div>
            )}
          </section>
          <Card>
            <StatusBadge
              label={item.status}
              tone={item.status === "PACKED" ? "ready" : "progress"}
            />
            <dl className="mt-5 divide-y divide-crease text-sm">
              {[
                [fr ? "Service" : "Service", serviceLabel(item.service_type)],
                [fr ? "Quantité" : "Quantity", String(item.quantity)],
                [
                  fr ? "Poids" : "Weight",
                  item.weight_kg ? `${item.weight_kg} kg` : "—",
                ],
                [
                  fr ? "Prix unitaire" : "Unit price",
                  formatCurrency(item.unit_price),
                ],
                [fr ? "Sous-total" : "Subtotal", formatCurrency(item.subtotal)],
                [fr ? "Description" : "Description", item.description || "—"],
                [
                  fr ? "État à la réception" : "Condition notes",
                  item.condition_notes || "—",
                ],
                [fr ? "Taches" : "Stain notes", item.stain_notes || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 py-3"
                >
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="break-words text-right font-medium text-navy">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
    </main>
  );
}
