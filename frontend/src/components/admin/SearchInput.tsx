import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/src/lib/utils";

export function SearchInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        className="ui-control ui-control-pill pl-10"
        {...props}
      />
    </div>
  );
}
