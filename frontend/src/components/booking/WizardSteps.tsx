import {
  CalendarDays,
  Check,
  ClipboardCheck,
  HandCoins,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/src/i18n/I18nProvider";

const STEPS: Array<{ path: string; label: string; icon: LucideIcon }> = [
  { path: "/book", label: "Services", icon: Sparkles },
  { path: "/book/schedule", label: "Schedule", icon: CalendarDays },
  { path: "/book/review", label: "Review", icon: ClipboardCheck },
  { path: "/book/confirm", label: "Payment option", icon: HandCoins },
];

export function WizardSteps({ current }: { current: number }) {
  const { t } = useI18n();
  const labels = [t("booking.services"), t("booking.scheduleStep"), t("booking.reviewStep"), t("booking.paymentStep")];
  return (
    <ol className="mb-5 grid grid-cols-4 items-start sm:mb-6 lg:mb-3">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < current;
        const isCurrent = stepNumber === current;
        const Icon = step.icon;

        return (
          <li
            key={step.path}
            className="relative flex min-w-0 flex-col items-center"
            aria-current={isCurrent ? "step" : undefined}
          >
            {stepNumber < STEPS.length && (
              <span
                className={`absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-4 h-px ${
                  isComplete ? "bg-gold" : "bg-crease"
                }`}
                aria-hidden="true"
              />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isCurrent
                  ? "bg-navy text-white shadow-sm"
                  : isComplete
                    ? "bg-gold-50 text-gold"
                    : "bg-steam text-ink-muted"
              }`}
            >
              {isComplete ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Icon className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {t("booking.step")} {stepNumber}: {labels[index]}
                {isComplete ? ` (${t("booking.completed")})` : ""}
              </span>
            </span>

            <span
              className={`mt-2 hidden truncate px-1 text-xs sm:block ${
                isCurrent ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              {labels[index]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
