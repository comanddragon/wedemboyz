"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, Mail, MapPin, Phone, Send, MessageCircle} from "lucide-react";

import { Button, CreaseDivider, EyebrowLabel, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { BUSINESS } from "@/lib/constants";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const CONTACT_INFO = [
  {
    icon: MessageCircle,
    accent: "coral",
    label: "WhatsApp",
    value: BUSINESS.phoneDisplay,
    href: BUSINESS.whatsappHref,
  },
    {
        icon: Phone,
        accent: "coral",
        label: "Call",
        value: BUSINESS.phoneDisplay,
        href: BUSINESS.telHref,
    },
  {
    icon: Mail,
    accent: "turquoise",
    label: "Email us",
    value: "hello@wedemboyz.example",
    href: "mailto:hello@wedemboyz.example",
  },
  {
    icon: MapPin,
    accent: "sun",
    label: "Find us",
    value: BUSINESS.address,
    href: BUSINESS.mapsUrl,
  },
  {
    icon: Clock,
    accent: "clothesline",
    label: "Open hours",
    value: BUSINESS.hours,
  },
] as const;

const ACCENT_CLASSES: Record<(typeof CONTACT_INFO)[number]["accent"], string> = {
  coral: "bg-coral-50 text-coral",
  turquoise: "bg-turquoise-50 text-turquoise",
  sun: "bg-sun-50 text-[#8A6A03]",
  clothesline: "bg-clothesline-50 text-clothesline",
};

/**
 * Split-screen Contact section. Left half is a full-bleed map of the
 * Yaoundé service area; right half is the contact copy + form. The map's
 * right edge fades through a soft gradient so it dissolves into the
 * contact panel's background instead of meeting it at a hard seam —
 * the two halves read as one continuous surface rather than a divider.
 */
export function ContactSplit() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = (delay = 0) =>
    shouldReduceMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { delay, duration: 0.5, ease: EASE_OUT_EXPO },
        };

  return (
    <section className="relative w-full overflow-hidden bg-paper">
      <div className="grid grid-cols-1 lg:min-h-screen lg:grid-cols-2">
        {/* Map — left on desktop, below the contact panel on mobile (order-2) */}
        <div className="relative order-2 h-[340px] sm:h-[420px] lg:order-1 lg:h-auto">
          <iframe
            title="WEDEMBOYZ Lavomatique — Entrée Simbock, Yaoundé"
            src={BUSINESS.mapEmbedSrc}
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0 grayscale-[10%]"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Fade toward the contact panel — desktop: right edge (map sits to the
              left of the contact panel); mobile: top edge (map sits below the
              contact panel, so the seam to soften is at the top of the map). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/3 bg-linear-to-r from-transparent via-paper/60 to-paper lg:block"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-paper to-transparent lg:hidden"
          />

          {/* Small locator badge, echoes the EyebrowLabel treatment */}
          <a
            href={BUSINESS.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto absolute left-5 top-5 rounded-full border border-crease bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-ink-muted">
              <MapPin className="h-3.5 w-3.5 text-coral" aria-hidden="true" />
              {BUSINESS.address}
            </span>
          </a>
        </div>

        {/* Contact — right */}
        <div className="relative order-1 flex flex-col justify-center bg-paper px-6 py-16 sm:px-10 lg:order-2 lg:px-16 lg:py-24">
          <Link
            href="/"
            className="absolute right-6 top-6 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:right-10 sm:top-8 lg:right-16 lg:top-10"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>

          {/* Soft decorative color, kept behind content and out of reading flow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-turquoise-50 opacity-60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 left-0 h-56 w-56 rounded-full bg-sun-50 opacity-50 blur-3xl"
          />

          <div className="relative max-w-md">
            <motion.div {...fadeUp(0)}>
              <EyebrowLabel words={["REACH US", "REAL PEOPLE", "REAL FAST"]} />
              <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-tight text-navy md:text-5xl">
                Got a question? Just ask.
              </h1>
                <h1 className="mt-3 text-balance font-display text-2xl font-bold leading-tight text-gold md:text-3xl">
                    Contact us with just a click.
                </h1>
              <p className="mt-4 text-base text-ink-muted">
                No call centers, no chatbots pretending to be human. Reach out and someone from
                the team will get back to you — usually the same day.
              </p>
            </motion.div>

            <motion.div {...fadeUp(0.08)} className="mt-8 grid gap-5 sm:grid-cols-2">
              {CONTACT_INFO.map(({ icon: Icon, accent, label, value, ...rest }) => {
                const href = "href" in rest ? rest.href : undefined;
                const content = (
                  <>
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ACCENT_CLASSES[accent]}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p
                        className={cn(
                          "text-sm text-ink-muted",
                          href && "transition-colors group-hover:text-ink group-hover:underline",
                        )}
                      >
                        {value}
                      </p>
                    </div>
                  </>
                );

                if (!href) {
                  return (
                    <div key={label} className="-m-2 flex items-start gap-3 rounded-card p-2">
                      {content}
                    </div>
                  );
                }

                return (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group -m-2 flex items-start gap-3 rounded-card p-2 transition-colors hover:bg-steam focus:outline-none focus-visible:ring-1 focus-visible:ring-navy"
                  >
                    {content}
                  </a>
                );
              })}
            </motion.div>

            <CreaseDivider className="my-10" />

            <motion.div {...fadeUp(0.16)}>
              <ContactForm />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const shouldReduceMotion = useReducedMotion();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    // No backend endpoint wired up yet — this simulates a send so the
    // interaction feels real. Swap for a real submit handler when ready.
    window.setTimeout(() => setStatus("sent"), 700);
  }

  if (status === "sent") {
    return (
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: EASE_OUT_EXPO }}
        className="flex items-start gap-3 rounded-card border border-clothesline-50 bg-clothesline-50 p-5"
        role="status"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-clothesline" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-ink">Message sent — thank you!</p>
          <p className="mt-1 text-sm text-ink-muted">
            We&apos;ll get back to you soon. If it&apos;s urgent, call or WhatsApp us instead.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" type="text" placeholder="Your name" required />
        </Field>
        <Field label="Phone or email">
          <Input name="contact" type="text" placeholder="+237 6XX XXX XXX" required />
        </Field>
      </div>
      <Field label="Message">
        <Textarea name="message" placeholder="How can we help?" required />
      </Field>
      <Button type="submit" disabled={status === "sending"} className="w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden="true" />
        {status === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
