"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PromoCodeForm } from "@/src/components/discounts/PromoCodeForm";

export default function AdminNewPromoCodePage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/discounts/codes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to promo codes
      </Link>
      <h1 className="font-display mb-6 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        New promo code
      </h1>
      <PromoCodeForm onDone={() => router.push("/admin/discounts/codes")} />
    </main>
  );
}
