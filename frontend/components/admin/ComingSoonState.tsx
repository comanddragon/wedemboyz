import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui";

/**
 * Honest placeholder for admin sections whose backend endpoints don't exist
 * yet (customers, staff, discount campaigns, analytics — see PRODUCT.md
 * anti-references). Never fabricate data here; explain what's missing and,
 * where possible, point at what IS available today.
 */
export function ComingSoonState({
  icon: Icon,
  title,
  description,
  backHref,
  backLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed py-10 text-left">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-steam text-navy">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      </div>
      {backHref && (
        <Link href={backHref} className="text-sm font-medium text-navy hover:underline">
          {backLabel ?? "Back"}
        </Link>
      )}
    </Card>
  );
}
