"use client";

import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { useLockBodyScroll } from "@/src/hooks/useLockBodyScroll";
import {
  canAccess,
  ROLE_LABELS,
  type AdminPermission,
  type AdminRole,
} from "@/src/lib/admin-rbac";
import { useAuthStore } from "@/src/lib/stores/auth.store";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: AdminPermission;
};

const ADMIN_LINKS: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    href: "/admin/quick-sale",
    label: "Quick sale",
    icon: ShoppingBag,
    permission: "sales.create",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: Package,
    permission: "orders.view",
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    permission: "customers.view",
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Boxes,
    permission: "inventory.view",
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: Wallet,
    permission: "payments.view",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    permission: "finance.view",
  },
  {
    href: "/admin/chat",
    label: "Inbox",
    icon: MessageCircle,
    permission: "chat.manage",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: UserCog,
    permission: "staff.manage",
  },
  {
    href: "/admin/payroll",
    label: "Payroll",
    icon: Receipt,
    permission: "staff.manage",
  },
  {
    href: "/admin/discounts",
    label: "Discounts",
    icon: Tag,
    permission: "discounts.manage",
  },
  {
    href: "/admin/finance/credit",
    label: "Credit",
    icon: CreditCard,
    permission: "finance.view",
  },
];

const CUSTOMER_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/book", label: "Book pickup", icon: ShoppingBag },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/chat", label: "Support", icon: MessageCircle },
  { href: "/loyalty", label: "Rewards", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Links shown inline in the top bar; anything beyond this goes under "More" so the bar never scrolls. */
const MAX_INLINE = 7;

function NavMore({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasActive = items.some((item) => isActive(pathname, item.href));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${hasActive ? "bg-navy text-white" : open ? "bg-steam text-navy" : "text-ink-soft hover:bg-steam hover:text-navy"}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        More
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="ui-menu-in absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-2xl border border-crease/70 bg-white p-1.5 shadow-pop"
        >
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-navy text-white" : "text-ink-soft hover:bg-gold-50"}`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg ${active ? "bg-white/15 text-gold" : "bg-steam text-navy"}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/admin" &&
      href !== "/dashboard" &&
      pathname.startsWith(`${href}/`))
  );
}

export function DashboardNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const permissions = user?.staff_permissions ?? [];
  const role = user?.staff_role as AdminRole | null | undefined;
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone_number ||
    (admin ? "Staff" : "Customer");
  const links = (admin ? ADMIN_LINKS : CUSTOMER_LINKS).filter(
    (item) => !item.permission || canAccess(permissions, item.permission),
  );
  const mobileLinks = admin
    ? links.filter((item) =>
        [
          "/admin",
          "/admin/quick-sale",
          "/admin/orders",
          "/admin/chat",
        ].includes(item.href),
      )
    : links.filter((item) =>
        ["/dashboard", "/book", "/orders", "/chat"].includes(item.href),
      );
  useLockBodyScroll(open);

  return (
    <>
      <header className="mobile-safe-top relative z-40 flex h-[64px] shrink-0 items-center gap-3 border-b border-crease/70 bg-white/95 px-4 backdrop-blur-xl sm:h-[76px] sm:px-6 lg:border-0 lg:bg-gradient-to-b lg:from-crease lg:via-steam lg:to-steam/0 xl:px-7">
        <Link
          href="/"
          className="flex h-11 shrink-0 items-center gap-2 text-navy transition-colors sm:rounded-full sm:border sm:border-crease-strong sm:px-3.5 lg:h-10 lg:hover:border-navy lg:hover:bg-white/60"
          aria-label="Wedemboyz Lavomatique — back to home page"
        >
          <Image
            src="/icon-mark.png"
            alt=""
            width={24}
            height={29}
            priority
            className="h-7 w-auto"
          />
          <span className="font-display text-[0.95rem] font-semibold tracking-[-0.01em]">
            Wedemboyz Lavomatique
          </span>
        </Link>

        <nav
          className="mx-auto hidden max-w-[920px] items-center gap-1 rounded-full bg-white/90 p-1 shadow-float backdrop-blur lg:flex"
          aria-label={admin ? "Admin navigation" : "Customer navigation"}
        >
          {links.slice(0, MAX_INLINE).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${isActive(pathname, href) ? "bg-navy text-white" : "text-ink-soft hover:bg-steam hover:text-navy"}`}
            >
              {label}
            </Link>
          ))}
          {links.length > MAX_INLINE && (
            <NavMore items={links.slice(MAX_INLINE)} pathname={pathname} />
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <Link
            href={admin ? "/admin/chat" : "/notifications"}
            className="relative grid h-11 w-11 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-gold-50 sm:bg-white/90 sm:shadow-float lg:h-10 lg:w-10"
            aria-label={admin ? "Open inbox" : "Open notifications"}
          >
            {admin ? <MessageCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
          </Link>
          <details className="group relative hidden sm:block">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border-0 bg-white/90 shadow-float px-2 pr-3 text-navy marker:content-none">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-bold">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-24 truncate text-xs font-semibold">
                {name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-2xl border-0 bg-white/90 shadow-float p-2 shadow-pop">
              <div className="border-b border-crease-soft px-3 py-2">
                <p className="truncate text-sm font-semibold text-navy">
                  {name}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {admin && role ? ROLE_LABELS[role] : user?.is_guest ? "Guest — not saved to an account" : "Customer account"}
                </p>
              </div>
              {user?.is_staff && (
                <Link
                  href={admin ? "/dashboard" : "/admin"}
                  className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-mist"
                >
                  {admin ? "Customer view" : "Admin console"}
                </Link>
              )}
              <LogoutButton className="w-full justify-start" />
            </div>
          </details>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-full bg-navy text-white lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav
        className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-crease/80 bg-white/95 px-2 pt-2 shadow-[0_-12px_32px_-20px_color-mix(in_srgb,var(--color-navy)_45%,transparent)] backdrop-blur-xl lg:hidden"
        aria-label={
          admin ? "Admin quick navigation" : "Customer quick navigation"
        }
      >
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.68rem] font-semibold transition-colors ${active ? "bg-navy text-white" : "text-ink-muted active:bg-steam active:text-navy"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`h-[19px] w-[19px] ${active ? "text-gold" : ""}`}
                aria-hidden="true"
              />
              <span className="max-w-full truncate">
                {label.replace(" pickup", "")}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.68rem] font-semibold text-ink-muted active:bg-steam active:text-navy"
          aria-label="Open all navigation"
        >
          <Menu className="h-[19px] w-[19px]" aria-hidden="true" />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="mobile-safe-top mobile-safe-bottom absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-navy">Menu</p>
              <button
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-mist text-navy"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav
              className="mt-6 grid grid-cols-2 gap-2 overflow-y-auto"
              aria-label="All navigation"
            >
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive(pathname, href) ? "bg-navy text-white" : "bg-mist text-ink-soft active:bg-steam"}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-crease-soft pt-4">
              <p className="px-2 text-sm font-semibold text-navy">{name}</p>
              <p className="mb-2 px-2 text-xs text-ink-muted">
                {admin && role ? ROLE_LABELS[role] : user?.is_guest ? "Guest — not saved to an account" : "Customer account"}
              </p>
              <LogoutButton className="w-full justify-start" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
