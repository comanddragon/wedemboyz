"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DiscountCampaignForm } from "@/components/discounts/DiscountCampaignForm";

export default function AdminNewDiscountPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:px-10">
      <Link
        href="/admin/discounts"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to discounts
      </Link>
      <h1 className="font-display mb-6 text-xl font-semibold text-navy">New campaign</h1>
      <DiscountCampaignForm onDone={() => router.push("/admin/discounts")} />
    </main>
  );
}
