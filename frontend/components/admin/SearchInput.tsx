import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        className="w-full rounded-md border border-crease bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        {...props}
      />
    </div>
  );
}
