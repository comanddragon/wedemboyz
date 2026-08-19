import { ArrowLeft, Droplets, Shirt, Sparkles, Wind } from "lucide-react";
import Link from "next/link";

import { Card, EyebrowLabel } from "@/components/ui";

const PLANNED_PREFERENCES = [
    {
        icon: Droplets,
        title: "Water temperature",
        description: "Cold, warm, or hot as your default wash setting.",
    },
    {
        icon: Wind,
        title: "Spin speed",
        description: "How firmly your clothes get spun dry before folding.",
    },
    {
        icon: Sparkles,
        title: "Detergent",
        description: "Standard, hypoallergenic, or scent-free options.",
    },
    {
        icon: Shirt,
        title: "Folding style",
        description: "By outfit, by garment type, or hanger-ready.",
    },
];

export default function LaundryPreferencesPage() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-10">
            <Link
                href="/settings"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to settings
            </Link>

            <EyebrowLabel words={["Your account"]} />
            <h1 className="font-display mt-1 text-xl font-semibold text-navy">Laundry preferences</h1>

            <Card className="mt-6">
                <p className="text-sm text-ink">
                    We&apos;re building the ability to set a default water temperature, spin speed,
                    detergent, and folding style for every order.
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                    For now, you can leave any special instructions in the notes when you book a
                    pickup, and our team will follow them for that order.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-crease pt-6 sm:grid-cols-2">
                    {PLANNED_PREFERENCES.map(({ icon: Icon, title, description }) => (
                        <div key={title} className="flex gap-3 opacity-60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steam text-ink-muted">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
                            <div>
                                <p className="text-sm font-medium text-ink">{title}</p>
                                <p className="text-xs text-ink-muted">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-xs font-medium uppercase tracking-wide text-gold">Coming soon</p>
            </Card>
        </main>
    );
}
