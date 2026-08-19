"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PromoCodeForm } from "@/components/discounts/PromoCodeForm";

export default function AdminNewPromoCodePage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
      <Link
        href="/admin/discounts/codes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to promo codes
      </Link>
      <h1 className="font-display mb-6 text-xl font-semibold text-navy">New promo code</h1>
      <PromoCodeForm onDone={() => router.push("/admin/discounts/codes")} />
    </main>
  );
}
