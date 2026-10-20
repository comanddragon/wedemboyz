"use client";

import Image from "next/image";
import {
  CalendarClock,
  ClipboardCheck,
  PackageCheck,
  Truck,
} from "lucide-react";

import { Reveal } from "./Reveal";

const STEPS = [
  {
    icon: CalendarClock,
    title: "Reserve a window",
    description:
      "Choose a pickup slot from your phone. We confirm the address and the service — wash, iron, or dry-clean — before a runner is ever dispatched.",
  },
  {
    icon: ClipboardCheck,
    title: "Weighed and logged",
    description:
      "Every bag is weighed at your door, itemized on a duplicate ticket, and entered against your order number. Nothing travels unaccounted for.",
  },
  {
    icon: Truck,
    title: "Cleaned to spec",
    description:
      "Garments are sorted by fabric and service line, then cleaned, pressed, or dry-cleaned by staff trained on that specific line — not a single generic wash.",
  },
  {
    icon: PackageCheck,
    title: "Returned, checked",
    description:
      "Folded or hung, inspected against the original ticket, and delivered back to your door. You settle by cash, MTN, or Orange Money on arrival.",
  },
];

export function AtelierProcess() {
  return (
    <section className="relative isolate overflow-hidden py-14 sm:py-20 md:py-28">
      {/* Decorative background image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[42vw] xl:block"
      >
        <div
          className="relative h-full w-full"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 65%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 65%)",
          }}
        >
          <Image
            src="/images/process-laundromat-wide.jpg"
            alt=""
            fill
            sizes="42vw"
            className="object-cover object-[30%_60%] opacity-[0.3]"
            priority={false}
            loading="eager"
          />

          <div className="absolute inset-0 bg-[var(--at-ink)] opacity-40 mix-blend-multiply" />
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-xl">
          <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
            The process
          </span>

          <h2 className="at-display mt-2 text-2xl font-bold leading-tight text-[var(--at-ivory)] sm:mt-3 sm:text-3xl md:text-4xl">
            A fixed sequence, not a best effort.
          </h2>

          <p className="mt-3 text-sm leading-6 text-[var(--at-slate)] sm:mt-4 sm:text-base sm:leading-relaxed">
            {`The same four stages run on every order, from a single shirt to a
            household's weekly wash. Consistency is the actual product.`}
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:mt-12 md:mt-16 md:grid-cols-4 md:gap-x-10 md:gap-y-14">
          {STEPS.map((step, i) => {
            const Icon = step.icon;

            return (
              <Reveal key={step.title} delay={i * 0.1} className="relative">
                <div className="flex items-baseline justify-between border-b border-[var(--at-line)] pb-2.5 sm:pb-4">
                  <span className="at-serif-num text-2xl font-bold text-navy sm:text-4xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <Icon
                    className="h-5 w-5 text-[var(--at-brass-bright)]"
                    aria-hidden="true"
                  />
                </div>

                <h3 className="at-display mt-3 text-sm font-bold text-[var(--at-ivory)] sm:mt-5 sm:text-lg">
                  {step.title}
                </h3>

                <p className="mt-1.5 text-xs leading-5 text-[var(--at-slate)] sm:mt-2.5 sm:text-sm sm:leading-relaxed">
                  {step.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
