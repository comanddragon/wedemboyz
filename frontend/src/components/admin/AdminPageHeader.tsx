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
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <span aria-hidden="true" className="mb-3 block h-1 w-10 rounded-full bg-gradient-to-r from-gold to-gold/20" />
        <h1 className="font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] text-ink sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
