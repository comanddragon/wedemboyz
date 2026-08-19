import Link from "next/link";

import { Button } from "@/components/ui";

import { FoldStackIllustration } from "./FoldStackIllustration";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight text-navy md:text-5xl">
          Laundry, picked up, pressed, and brought back.
        </h1>
        <p className="mt-4 max-w-md text-base text-ink-muted">
          Book a pickup in Yaounde. We wash, iron, or dry-clean it, and deliver it back to your
          door — pay by cash, MTN, or Orange Money.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register">
            <Button>Make a Booking</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">See pricing</Button>
          </Link>
        </div>
      </div>
      <div className="flex justify-center">
        <FoldStackIllustration />
      </div>
    </section>
  );
}
