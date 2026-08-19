import type { ReactNode } from "react";

/**
 * Consistent header for every /admin/* screen — title + optional description
 * on the left, one primary action slot on the right. Keeps affordances the
 * same across sections instead of each page inventing its own header.
 */
export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
