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
  useLockBodyScroll(open);

  return (
    <>
      <header className="relative z-40 flex h-[84px] shrink-0 items-center gap-3 bg-gradient-to-b from-crease via-steam to-steam/0 px-4 sm:px-6 xl:px-7">
        <Link
          href="/"
          className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-crease-strong bg-transparent px-3.5 text-navy transition-colors hover:border-navy hover:bg-white/60"
          aria-label="WEDEMBOYZ — back to home page"
        >
          <Image
            src="/icon-mark.png"
            alt=""
            width={24}
            height={29}
            priority
            className="h-7 w-auto"
          />
          <span className="hidden font-display text-[0.95rem] font-medium tracking-[0.01em] sm:block">
            WEDEMBOYZ
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
            className="relative grid h-10 w-10 place-items-center rounded-full border-0 bg-white/90 shadow-float text-navy transition-colors hover:border-gold hover:bg-gold-50"
            aria-label={admin ? "Open inbox" : "Open notifications"}
          >
            <Bell className="h-4 w-4" />
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
                  {admin && role ? ROLE_LABELS[role] : "Customer account"}
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
            className="grid h-10 w-10 place-items-center rounded-full bg-navy text-white lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-white p-5 shadow-2xl">
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
            <nav className="mt-7 grid gap-1" aria-label="Mobile navigation">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isActive(pathname, href) ? "bg-navy text-white" : "text-ink-soft hover:bg-mist"}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-crease-soft pt-4">
              <p className="px-2 text-sm font-semibold text-navy">{name}</p>
              <p className="mb-2 px-2 text-xs text-ink-muted">
                {admin && role ? ROLE_LABELS[role] : "Customer account"}
              </p>
              <LogoutButton className="w-full justify-start" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
