"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Droplets,
  Fan,
  Flame,
  Layers,
  RotateCw,
  Shirt,
  Sparkles,
  WashingMachine,
  Wind,
} from "lucide-react";

import type { ServiceType } from "@/src/types";

import { Reveal } from "./Reveal";

const SERVICES: {
  type: ServiceType;
  icon: typeof Droplets;
  label: string;
  description: string;
  price: number;
  perKg: boolean;
}[] = [
  {
    type: "TSHIRT",
    icon: Shirt,
    label: "T-Shirt",
    description:
      "Everyday wear, washed to fabric-appropriate settings and folded to a consistent standard — not just clean, but presentable.",
    price: 500,
    perKg: false,
  },
  {
    type: "CHEMISE",
    icon: Wind,
    label: "Chemise (Shirt)",
    description:
      "The complete cycle for shirts, uniforms, and workwear that need to leave the bag ready to put on.",
    price: 600,
    perKg: false,
  },
  {
    type: "VESTE",
    icon: Layers,
    label: "Veste (Jacket)",
    description: "Structured outerwear, cleaned and pressed to hold its shape.",
    price: 2000,
    perKg: false,
  },
  {
    type: "ROBE",
    icon: Sparkles,
    label: "Robe (Dress)",
    description:
      "Dresses and evening wear that need careful handling, not a standard wash cycle.",
    price: 2500,
    perKg: false,
  },
  {
    type: "DRAPS_COMPLET",
    icon: RotateCw,
    label: "Draps Complet",
    description:
      "Full bed sheet sets, washed and pressed as one flat-priced line.",
    price: 1500,
    perKg: false,
  },
  {
    type: "LAVAGE_ESSORAGE",
    icon: WashingMachine,
    label: "Lavage et Essorage",
    description:
      "Drop in a load at the storefront and let the machine do the wash-and-spin cycle on its own.",
    price: 600,
    perKg: true,
  },
  {
    type: "LAVAGE_SECHAGE",
    icon: Fan,
    label: "Lavage, Essorage et Séchage",
    description:
      "Tumble-dried until fully dry and ready to fold — no line-drying wait required.",
    price: 1000,
    perKg: true,
  },
  {
    type: "REPASSAGE_PLASTIF",
    icon: Flame,
    label: "Repassage et Plastification",
    description:
      "Storefront pressing station with protective plastic wrap, so pieces stay crisp on the way home.",
    price: 1000,
    perKg: true,
  },
];

export function AtelierServices() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-t border-[var(--at-line)] bg-[var(--at-panel)] px-4 py-14 sm:px-6 sm:py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-10 md:flex-row md:items-end">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end md:max-w-2xl">
            <Reveal className="max-w-xl">
              <span className="at-display text-xs font-semibold uppercase tracking-[0.24em] text-[var(--at-brass-bright)]">
                The service lines
              </span>
              <h2 className="at-display mt-2 text-2xl font-bold leading-tight text-[var(--at-ivory)] sm:mt-3 sm:text-3xl md:text-4xl">
                Flat-priced by the piece, or by the kilo.
              </h2>
            </Reveal>

            {/* Second entry in the "Plate" device introduced in the hero —
                reused once, deliberately, rather than scattered everywhere. */}
            <Reveal delay={0.15} className="shrink-0">
              <figure className="hidden w-24 sm:block sm:w-28">
                <div className="overflow-hidden rounded-sm border border-[var(--at-line-strong)] bg-[var(--at-ink)] p-1 shadow-pop">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2px]">
                    <Image
                      src="/images/services-laundry-basket.jpg"
                      alt="A basket of freshly laundered clothes beside the washer"
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                </div>
                <figcaption
                  className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--at-slate)]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Plate 05 — sorted, before the wash
                </figcaption>
              </figure>
            </Reveal>
          </div>

          <Reveal
            delay={0.1}
            className="max-w-sm text-sm text-[var(--at-slate)]"
          >
            1,000 XAF minimum on per-kilo lines. Pickup and delivery is a flat
            1,500 XAF — the total is confirmed before we collect.
          </Reveal>
        </div>

        <div className="mt-8 grid grid-cols-1 divide-y divide-[var(--at-line)] border-y border-[var(--at-line)] sm:mt-14 md:grid-cols-2 md:divide-x md:divide-y-0">
          {SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.type} delay={i * 0.08}>
                <motion.div
                  className="group relative grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 py-4 sm:flex sm:flex-col sm:items-stretch sm:justify-between sm:p-8 md:p-10"
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          backgroundColor:
                            "rgba(223, 160, 19, 0.06)",
                        }
                  }
                  transition={{ duration: 0.3 }}
                >
                  <div className="contents sm:flex sm:items-start sm:justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--at-line-strong)] text-[var(--at-brass-bright)] transition-colors group-hover:border-[var(--at-brass)] sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="at-serif-num order-3 text-right text-sm font-bold text-[var(--at-ivory)] sm:order-none sm:text-xl">
                      {service.price.toLocaleString("en-US")}
                      <span className="ml-1 text-xs font-medium text-[var(--at-slate)]">
                        {service.perKg ? "XAF/kg" : "XAF"}
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0 sm:mt-8">
                    <h3 className="at-display truncate text-sm font-bold text-[var(--at-ivory)] sm:text-xl">
                      {service.label}
                    </h3>
                    <p className="mt-1 line-clamp-2 max-w-md text-xs leading-4 text-[var(--at-slate)] sm:mt-2.5 sm:text-sm sm:leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
