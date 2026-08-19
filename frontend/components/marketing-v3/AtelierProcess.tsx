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
        <section className="relative isolate overflow-hidden py-24 md:py-28">
            {/* Decorative background image */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[42vw] xl:block"
            >
                <div
                    className="relative h-full w-full"
                    style={{
                        maskImage:
                            "linear-gradient(to right, transparent 0%, black 65%)",
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
            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <Reveal className="max-w-xl">
          <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
            The process
          </span>

                    <h2 className="at-display mt-3 text-3xl font-bold leading-tight text-[var(--at-ivory)] md:text-4xl">
                        A fixed sequence, not a best effort.
                    </h2>

                    <p className="mt-4 text-base leading-relaxed text-[var(--at-slate)]">
                        {`The same four stages run on every order, from a single shirt to a
            household's weekly wash. Consistency is the actual product.`}
                    </p>
                </Reveal>

                <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-4">
                    {STEPS.map((step, i) => {
                        const Icon = step.icon;

                        return (
                            <Reveal
                                key={step.title}
                                delay={i * 0.1}
                                className="relative"
                            >
                                <div className="flex items-baseline justify-between border-b border-[var(--at-line)] pb-4">
                  <span className="at-serif-num text-4xl font-bold text-navy">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                                    <Icon
                                        className="h-5 w-5 text-[var(--at-brass-bright)]"
                                        aria-hidden="true"
                                    />
                                </div>

                                <h3 className="at-display mt-5 text-lg font-bold text-[var(--at-ivory)]">
                                    {step.title}
                                </h3>

                                <p className="mt-2.5 text-sm leading-relaxed text-[var(--at-slate)]">
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