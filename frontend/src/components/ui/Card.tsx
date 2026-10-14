import type { HTMLAttributes } from "react";

import { cn } from "@/src/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-crease/70 bg-white p-5 shadow-card",
        className,
      )}
      {...props}
    />
  );
}
