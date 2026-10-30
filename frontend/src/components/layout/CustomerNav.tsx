"use client";

import {
  Bell,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { useLockBodyScroll } from "@/src/hooks/useLockBodyScroll";
import { useAuthStore } from "@/src/lib/stores/auth.store";

const GROUPS: {
  label: string;
  links: { href: string; label: string; icon: LucideIcon; tone: string }[];
}[] = [
  {
    label: "My laundry",
    links: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        tone: "text-turquoise",
      },
      {
        href: "/book",
        label: "Book a pickup",
        icon: ShoppingBag,
        tone: "text-gold",
      },
      {
        href: "/orders",
        label: "My orders",
        icon: Package,
        tone: "text-coral",
      },
      {
        href: "/payments",
        label: "Payments",
        icon: Receipt,
        tone: "text-clothesline",
      },
      {
        href: "/chat",
        label: "Support chat",
        icon: MessageCircle,
        tone: "text-turquoise",
      },
      { href: "/loyalty", label: "Rewards", icon: Sparkles, tone: "text-gold" },
    ],
  },
  {
    label: "Account",
    links: [
      {
        href: "/notifications",
        label: "Notifications",
        icon: Bell,
        tone: "text-coral",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        tone: "text-ink-muted",
      },
    ],
  },
];

function Sidebar({ close }: { close: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone_number ||
    "Customer";

  return (
    <aside className="flex h-full w-[272px] flex-col border-r border-crease bg-white text-ink-soft">
      <div className="flex h-20 items-center gap-3 border-b border-crease px-5">
        <Link
          href="/"
          aria-label="Wedemboyz Lavomatique — back to home page"
          className="flex items-center gap-3"
        >
          <Image
            src="/icon-mark.png"
            alt=""
            width={46}
            height={44}
            priority
            className="h-11 w-auto"
          />
          <div>
            <p className="font-display text-base font-semibold text-navy">
              Wedemboyz Lavomatique
            </p>
            <p className="text-xs text-ink-muted">My laundry</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={close}
          className="ml-auto rounded-md p-2 text-ink-muted hover:bg-dashboard-blue-50 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav
        className="flex-1 space-y-7 overflow-y-auto px-3 py-5"
        aria-label="Customer navigation"
      >
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon, tone }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-dashboard-blue text-white shadow-nav-active" : "text-ink-soft hover:bg-dashboard-blue-50 hover:text-dashboard-blue"}`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] ${active ? "text-white" : tone}`}
                    />
                    <span className="font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-crease p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-mist p-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-turquoise text-sm font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-soft">
              {name}
            </p>
            <p className="text-xs text-ink-muted">Customer account</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {user?.is_staff ? (
            <Link
              href="/admin"
              className="text-xs font-medium text-dashboard-blue"
            >
              Admin view
            </Link>
          ) : (
            <span />
          )}
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export function CustomerNav() {
  const [open, setOpen] = useState(false);
  useLockBodyScroll(open);
  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 items-center border-b border-crease bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-crease p-2 text-navy"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="ml-3 font-display font-semibold text-navy">
          My dashboard
        </span>
      </div>
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar close={() => setOpen(false)} />
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-navy/45"
            onClick={() => setOpen(false)}
            aria-label="Close navigation backdrop"
          />
          <div className="relative h-full w-[272px] shadow-2xl">
            <Sidebar close={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
