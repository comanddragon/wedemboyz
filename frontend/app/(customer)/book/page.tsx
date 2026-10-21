"use client";

import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { WizardSteps } from "@/src/components/booking/WizardSteps";
import {
  Button,
  Card,
  CreaseDivider,
  Field,
  Input,
  Select,
  ServiceIcon,
  Textarea,
  serviceLabel,
} from "@/src/components/ui";
import { useBooking } from "@/src/hooks/useBooking";
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
  const { items, addItem, removeItem, subtotal } = useBooking();

  const [serviceType, setServiceType] = useState<ServiceType>("TSHIRT");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose a JPG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Photo must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError("");
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    // Start a guest session in the background on the first item, so a visitor
    // can book without signing up. Failures are retried at checkout.
    void ensureSession().catch(() => undefined);
    addItem({
      service_type: serviceType,
      label,
      description,
      weight_kg: Number(weightKg),
      quantity: Number(quantity) || 1,
      photo: photo ?? undefined,
      photoPreviewUrl: photoPreview ?? undefined,
    });
    setLabel("");
    setDescription("");
    setWeightKg("1");
    setQuantity("1");
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <h1 className="font-display mb-1 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        Book a pickup
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        Step 1 — what needs cleaning?
      </p>
      <WizardSteps current={1} />

      <div className="grid items-start gap-6 lg:grid-cols-2 xl:gap-10">
        <Card>
          <form onSubmit={handleAddItem}>
            <Field label="Service">
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

            <Field label="Item label">
              <Input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Navy suit jacket"
              />
            </Field>

            <Field label="Description (optional)">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Small coffee stain on left sleeve, please pre-treat"
              />
            </Field>

            <div className="mb-4">
              <p className="mb-1.5 font-display text-[0.8125rem] font-medium text-ink">
                Item photo <span className="font-normal text-ink-muted">(optional)</span>
              </p>
              {photoPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-crease bg-steam/40 p-2">
                  <Image src={photoPreview} alt="Selected item preview" width={64} height={64} unoptimized className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{photo?.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">Ready to attach</p>
                  </div>
                  <button type="button" onClick={clearPhoto} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-white hover:text-status-cancelled-text" aria-label="Remove selected photo"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-crease px-3 py-3 text-xs font-medium text-ink-muted transition-colors hover:border-navy/40 hover:bg-steam/50 hover:text-navy focus-within:ring-4 focus-within:ring-gold/30">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  Add photo or use camera
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoChange} className="sr-only" />
                </label>
              )}
              {photoError ? <p className="mt-1.5 text-xs text-status-cancelled-text">{photoError}</p> : <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-muted"><Camera className="h-3 w-3" aria-hidden="true" />Show stains or special-care details · max 5 MB</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </Field>
              <Field label="Quantity">
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>

            <Button type="submit" variant="secondary" className="w-full">
              Add item
            </Button>
          </form>
        </Card>

        <section>
          <h2 className="font-display mb-3 text-sm font-medium text-ink">
            Items ({items.length})
          </h2>
          {items.length === 0 && (
            <p className="text-sm text-ink-muted">No items added yet.</p>
          )}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.clientId}>
                <Card className="flex items-start gap-3 p-4">
                  {item.photoPreviewUrl ? <Image src={item.photoPreviewUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="mt-0.5 text-navy"><ServiceIcon type={item.service_type} /></span>}
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
                    onClick={() => removeItem(item.clientId)}
                    aria-label="Remove item"
                    className="text-ink-muted hover:text-status-cancelled-text"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-ink-muted">
            Estimated subtotal: {subtotal} XAF
          </p>
        </section>
      </div>

      <div className="mt-8 flex justify-between">
        <Link href="/dashboard">
          <Button variant="ghost">Back</Button>
        </Link>
        {items.length > 0 && (
          <Link href="/book/schedule">
            <Button>Next: Schedule</Button>
          </Link>
        )}
      </div>
    </main>
  );
}
