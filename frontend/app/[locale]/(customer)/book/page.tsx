"use client";

import { Camera, ImagePlus, Pencil, Trash2, X } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useRef, useState } from "react";

import { BookingShell } from "@/src/components/booking/BookingShell";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  ServiceIcon,
  Textarea,
  serviceLabel,
} from "@/src/components/ui";
import { useBooking } from "@/src/hooks/useBooking";
import { formatCurrency } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";
import { ensureSession } from "@/src/lib/guest-session";
import type { ServiceType } from "@/src/types";

const SERVICE_TYPES: ServiceType[] = [
  "VESTE",
  "TSHIRT",
  "CHEMISE",
  "PANTALON",
  "PULL",
  "ROBE",
  "ENSEMBLE",
  "DRAPS_COMPLET",
  "COUETTE_1P",
  "COUETTE_2P",
  "COUETTE_3P",
  "LAVAGE_ESSORAGE",
  "LAVAGE_SECHAGE",
  "REPASSAGE_PLASTIF",
];

export default function BookServicesPage() {
  const { t } = useI18n();
  const { items, addItem, updateItem, removeItem, subtotal } = useBooking();

  const [serviceType, setServiceType] = useState<ServiceType>("TSHIRT");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (photos.length + files.length > 6) {
      setPhotoError(t("booking.photoCountError"));
      e.target.value = "";
      return;
    }
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    ) {
      setPhotoError(t("booking.photoTypeError"));
      e.target.value = "";
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setPhotoError(t("booking.photoSizeError"));
      e.target.value = "";
      return;
    }
    setPhotos((current) => [...current, ...files]);
    setPhotoPreviews((current) => [
      ...current,
      ...files.map(URL.createObjectURL),
    ]);
    setPhotoError("");
    e.target.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setPhotoPreviews((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function beginEdit(clientId: string) {
    const item = items.find((candidate) => candidate.clientId === clientId);
    if (!item) return;
    setEditingId(clientId);
    setServiceType(item.service_type);
    setLabel(item.label ?? "");
    setDescription(item.description ?? "");
    setWeightKg(String(item.weight_kg));
    setQuantity(String(item.quantity ?? 1));
    setPhotos(item.photos ?? []);
    setPhotoPreviews(item.photoPreviewUrls ?? []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    // Start a guest session in the background on the first item, so a visitor
    // can book without signing up. Failures are retried at checkout.
    void ensureSession().catch(() => undefined);
    const item = {
      service_type: serviceType,
      label,
      description,
      weight_kg: Number(weightKg),
      quantity: Number(quantity) || 1,
      photos,
      photoPreviewUrls: photoPreviews,
    };
    if (editingId) updateItem(editingId, item);
    else addItem(item);
    setEditingId(null);
    setLabel("");
    setDescription("");
    setWeightKg("1");
    setQuantity("1");
    setPhotos([]);
    setPhotoPreviews([]);
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  return (
    <BookingShell
      step={1}
      subtitle="booking.step1"
      actions={
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost">{t("booking.back")}</Button>
          </Link>
          {items.length > 0 && (
            <Link href="/book/schedule">
              <Button>{t("booking.nextSchedule")}</Button>
            </Link>
          )}
        </div>
      }
    >
      <div className="grid h-full min-h-0 items-start gap-5 pb-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-8">
        <Card className="p-4 lg:p-5">
          <form onSubmit={handleAddItem}>
            <Field label={t("booking.service")}>
              <Select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {serviceLabel(type)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("booking.itemLabel")}>
              <Input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("booking.itemPlaceholder")}
              />
            </Field>

            <Field label={t("booking.description")}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("booking.descriptionPlaceholder")}
                rows={2}
              />
            </Field>

            <div className="mb-4">
              <p className="mb-1.5 font-display text-[0.8125rem] font-medium text-ink">
                {t("booking.photo")} {" "}
                <span className="font-normal text-ink-muted">({t("booking.optional")})</span>
              </p>
              {photoPreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photoPreviews.map((preview, index) => (
                    <div
                      key={preview}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-crease bg-steam"
                    >
                      <Image
                        src={preview}
                        alt={`Selected item photo ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow-float hover:text-status-cancelled-text"
                        aria-label={`${t("booking.removePhoto")} ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {photoPreviews.length < 6 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-crease text-[11px] font-medium text-ink-muted hover:border-navy/40 hover:text-navy">
                      <ImagePlus className="h-4 w-4" /> {t("booking.addMore")}
                      <input
                        ref={photoInputRef}
                        multiple
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-crease px-3 py-3 text-xs font-medium text-ink-muted transition-colors hover:border-navy/40 hover:bg-steam/50 hover:text-navy focus-within:ring-4 focus-within:ring-gold/30">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("booking.addPhoto")}
                  <input
                    ref={photoInputRef}
                    multiple
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
              )}
              {photoError ? (
                <p className="mt-1.5 text-xs text-status-cancelled-text">
                  {photoError}
                </p>
              ) : (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted">
                  <Camera className="h-3 w-3" aria-hidden="true" />
                  {t("booking.photoLimit")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("booking.weight")}>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </Field>
              <Field label={t("booking.quantity")}>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>

            <Button type="submit" variant="secondary" className="w-full">
              {editingId ? t("booking.save") : t("booking.addItem")}
            </Button>
          </form>
        </Card>

        <section className="flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-baseline justify-between gap-4">
            <h2 className="font-display text-sm font-medium text-ink">
              {t("booking.items")} ({items.length})
            </h2>
            <p className="text-sm font-semibold tabular-nums text-navy">
              {formatCurrency(subtotal)}
            </p>
          </div>
          {items.length === 0 && (
            <p className="text-sm text-ink-muted">{t("booking.noItems")}</p>
          )}
          <ul className="min-h-0 space-y-2 pr-1 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-gutter:stable]">
            {items.map((item) => (
              <li key={item.clientId}>
                <Card className="flex items-start gap-3 p-4">
                  {item.photoPreviewUrls?.[0] ? (
                    <Image
                      src={item.photoPreviewUrls[0]}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="mt-0.5 text-navy">
                      <ServiceIcon type={item.service_type} />
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">
                      {item.label || serviceLabel(item.service_type)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {serviceLabel(item.service_type)} — {item.weight_kg}kg x
                      {item.quantity ?? 1}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-xs text-ink-muted">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => beginEdit(item.clientId)}
                    aria-label={`${t("booking.edit")} ${item.label || serviceLabel(item.service_type)}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-steam hover:text-navy"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.clientId)}
                    aria-label={t("booking.removeItem")}
                    className="text-ink-muted hover:text-status-cancelled-text"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BookingShell>
  );
}
