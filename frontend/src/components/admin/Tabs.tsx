"use client";

import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { usePathname } from "next/navigation";

import { stripLocale } from "@/src/i18n/config";

import { cn } from "@/src/lib/utils";

export function Tabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-crease"
    >
      {items.map((item) => {
        const isActive = stripLocale(pathname) === stripLocale(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-navy",
              isActive ? "text-navy" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-navy transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
