import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "secondary" | "ghost" | "danger";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-navy text-white hover:bg-navy-600 disabled:bg-navy/40",
  // The site's CTA color — "Book a Pickup" style buttons. Always gold, per CLAUDE.md.
  gold: "bg-gold text-navy shadow-sm hover:brightness-95 active:scale-[0.98] active:brightness-90 disabled:bg-gold/40 disabled:text-navy/60 disabled:active:scale-100 motion-reduce:active:scale-100",
  secondary: "border border-crease bg-white text-ink hover:bg-steam disabled:opacity-50",
  ghost: "text-navy hover:bg-steam disabled:opacity-50",
  danger: "border border-status-cancelled-text/30 text-status-cancelled-text hover:bg-status-cancelled-bg disabled:opacity-50",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all motion-reduce:transition-none disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
