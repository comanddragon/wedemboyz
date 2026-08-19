"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function Tabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex items-center gap-1 border-b border-crease" role="tablist">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-navy",
              isActive ? "text-navy" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-navy transition-opacity",
                isActive ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </div>
  );
}
