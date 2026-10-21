import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/src/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-navy text-white shadow-btn-navy hover:-translate-y-px hover:bg-navy-600 hover:shadow-btn-navy-hover active:translate-y-0 active:scale-[0.98] disabled:bg-navy/40 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100",
  // The site's CTA color — "Book a Pickup" style buttons. Always gold, per CLAUDE.md.
  gold: "bg-gold text-navy shadow-btn-gold hover:-translate-y-px hover:brightness-95 active:scale-[0.98] active:brightness-90 disabled:bg-gold/40 disabled:text-navy/60 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100 motion-reduce:active:scale-100 motion-reduce:hover:translate-y-0",
  secondary:
    "border border-crease bg-white text-ink shadow-sm hover:border-navy/30 hover:bg-steam active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
  ghost: "text-navy hover:bg-steam active:scale-[0.98] disabled:opacity-50",
  danger:
    "border border-status-cancelled-text/30 text-status-cancelled-text hover:bg-status-cancelled-bg disabled:opacity-50",
};

type ButtonStyleOptions = {
  variant?: NonNullable<ButtonProps["variant"]>;
  size?: NonNullable<ButtonProps["size"]>;
  className?: string;
};

/** Class string for the button look. Use on a Link when the element navigates. */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-display font-medium tracking-[0.005em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 motion-reduce:transition-none disabled:cursor-not-allowed",
    size === "sm"
      ? "min-h-9 px-3.5 py-1.5 text-xs"
      : "min-h-11 px-5 py-2.5 text-sm",
    VARIANT_CLASSES[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...props} />
  );
}
