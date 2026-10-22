"use client";

import type { FormEvent } from "react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Clock, MapPin, Phone, MessageCircle } from "lucide-react";

import {
  Button,
  CreaseDivider,
  EyebrowLabel,
  Field,
  Input,
  Textarea,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { BUSINESS } from "@/src/lib/constants";
import { useI18n } from "@/src/i18n/I18nProvider";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ACCENT_CLASSES = {
  coral: "bg-coral-50 text-coral",
  sun: "bg-sun-50 text-sun-600",
  clothesline: "bg-clothesline-50 text-clothesline",
} as const;

export function ContactSplit() {
  const { t, tArray } = useI18n();
  const shouldReduceMotion = useReducedMotion();

  const contactInfo = [
    {
      icon: MessageCircle,
      accent: "coral" as const,
      label: t("contactPage.whatsapp"),
      value: BUSINESS.phoneDisplay,
      href: BUSINESS.whatsappHref,
    },
    {
      icon: Phone,
      accent: "coral" as const,
      label: t("contactPage.call"),
      value: BUSINESS.phoneDisplay,
      href: BUSINESS.telHref,
    },
    {
      icon: MapPin,
      accent: "sun" as const,
      label: t("contactPage.findUs"),
      value: BUSINESS.address,
      href: BUSINESS.mapsUrl,
    },
    {
      icon: Clock,
      accent: "clothesline" as const,
      label: t("contactPage.openHours"),
      value: BUSINESS.hours,
    },
  ];

  const fadeUp = (delay = 0) =>
    shouldReduceMotion
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
      : {
          initial: false as const,
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
            title="Wedemboyz Lavomatique — Entrée Simbock, Yaoundé"
            src={BUSINESS.mapEmbedSrc}
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0 grayscale-[10%]"
            referrerPolicy="no-referrer-when-downgrade"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/3 bg-linear-to-r from-transparent via-paper/60 to-paper lg:block"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-paper to-transparent lg:hidden"
          />

          {/* Small locator badge */}
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
            {t("contactPage.backToHome")}
          </Link>

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
              <EyebrowLabel
                words={
                  tArray("contactPage.eyebrowWords").length
                    ? tArray("contactPage.eyebrowWords")
                    : ["REACH US", "REAL PEOPLE", "REAL FAST"]
                }
              />
              <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-tight text-navy md:text-5xl">
                {t("contactPage.title")}
              </h1>
              <p className="mt-3 text-balance font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] text-gold sm:text-[2rem] md:text-3xl">
                {t("contactPage.subtitle")}
              </p>
              <p className="mt-4 text-base text-ink-muted">
                {t("contactPage.description")}
              </p>
            </motion.div>

            <motion.div
              {...fadeUp(0.08)}
              className="mt-8 grid gap-5 sm:grid-cols-2"
            >
              {contactInfo.map(
                ({ icon: Icon, accent, label, value, ...rest }) => {
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
                            href &&
                              "transition-colors group-hover:text-ink group-hover:underline",
                          )}
                        >
                          {value}
                        </p>
                      </div>
                    </>
                  );

                  if (!href) {
                    return (
                      <div
                        key={label}
                        className="-m-2 flex items-start gap-3 rounded-card p-2"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <a
                      key={label}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="group -m-2 flex items-start gap-3 rounded-card p-2 transition-colors hover:bg-steam focus:outline-none focus-visible:ring-1 focus-visible:ring-navy"
                    >
                      {content}
                    </a>
                  );
                },
              )}
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
  const { t } = useI18n();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = [
      `${t("contactPage.prefillHello")} ${String(data.get("name") ?? "").trim()}.`,
      `${t("contactPage.prefillContact")} ${String(data.get("contact") ?? "").trim()}.`,
      String(data.get("message") ?? "").trim(),
    ].join("\n\n");
    const url = `${BUSINESS.whatsappHref}?text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (!whatsappWindow) window.location.assign(url);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("contactPage.nameLabel")}>
          <Input
            name="name"
            type="text"
            placeholder={t("contactPage.namePlaceholder")}
            required
          />
        </Field>
        <Field label={t("contactPage.contactLabel")}>
          <Input
            name="contact"
            type="text"
            placeholder={t("contactPage.contactPlaceholder")}
            required
          />
        </Field>
      </div>
      <Field label={t("contactPage.messageLabel")}>
        <Textarea
          name="message"
          placeholder={t("contactPage.messagePlaceholder")}
          required
        />
      </Field>
      <Button type="submit" className="w-full sm:w-auto">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t("contactPage.submitButton")}
      </Button>
      <p className="mt-2 text-xs text-ink-muted">
        {t("contactPage.helperText")}
      </p>
    </form>
  );
}
