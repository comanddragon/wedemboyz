"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DiscountCampaignForm } from "@/src/components/discounts/DiscountCampaignForm";

export default function AdminNewDiscountPage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <Link
        href="/admin/discounts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to discounts
      </Link>
      <h1 className="font-display mb-6 text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
        New campaign
      </h1>
      <DiscountCampaignForm onDone={() => router.push("/admin/discounts")} />
    </main>
  );
}
