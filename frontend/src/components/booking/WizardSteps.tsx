import { Check } from "lucide-react";

const STEPS = [
    { path: "/book", label: "Services" },
    { path: "/book/schedule", label: "Schedule" },
    { path: "/book/review", label: "Review" },
    { path: "/book/confirm", label: "Payment" },
];

export function WizardSteps({ current }: { current: number }) {
    return (
        <ol className="mb-8 flex flex-wrap items-center gap-y-4">
            {STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < current;
                const isCurrent = stepNumber === current;

                return (
                    <li
                        key={step.path}
                        className="flex items-center sm:flex-1 last:sm:flex-none"
                    >
                        <div className="flex items-center gap-2">
              <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                      isCurrent
                          ? "bg-navy text-white"
                          : isComplete
                              ? "bg-gold-50 text-gold"
                              : "bg-steam text-ink-muted"
                  }`}
              >
                {isComplete ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                    stepNumber
                )}
              </span>

                            <span
                                className={`text-sm ${
                                    isCurrent ? "font-medium text-ink" : "text-ink-muted"
                                }`}
                            >
                {step.label}
              </span>
                        </div>

                        {stepNumber < STEPS.length && (
                            <span
                                className="mx-3 hidden h-px flex-1 bg-crease sm:block"
                                aria-hidden="true"
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}