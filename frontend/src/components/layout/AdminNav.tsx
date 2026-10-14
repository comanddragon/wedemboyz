"use client";

import {
  BarChart3,
  Banknote,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  ShoppingBag,
  Tag,
  Users,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { useLockBodyScroll } from "@/src/hooks/useLockBodyScroll";
import {
  canAccess,
  ROLE_LABELS,
  type AdminPermission,
  type AdminRole,
} from "@/src/lib/admin-rbac";
import { useAuthStore } from "@/src/lib/stores/auth.store";

const GROUPS: {
  label: string;
  links: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    permission: AdminPermission;
  }[];
}[] = [
  {
    label: "Workspace",
    links: [
      {
        href: "/admin",
        label: "Overview",
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
        href: "/admin/payments",
        label: "Payments",
        icon: Wallet,
        permission: "payments.view",
      },
      {
        href: "/admin/chat",
        label: "Chat inbox",
        icon: MessageCircle,
        permission: "chat.manage",
      },
    ],
  },
  {
    label: "Management",
    links: [
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
        href: "/admin/finance/credit",
        label: "Customer credit",
        icon: CreditCard,
        permission: "finance.view",
      },
      {
        href: "/admin/discounts",
        label: "Discounts",
        icon: Tag,
        permission: "discounts.manage",
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: "finance.view",
      },
      {
        href: "/admin/staff",
        label: "Staff & access",
        icon: UserCog,
        permission: "staff.manage",
      },
      {
        href: "/admin/payroll",
        label: "Payroll",
        icon: Banknote,
        permission: "staff.manage",
      },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const permissions = user?.staff_permissions ?? [];
  const role = user?.staff_role as AdminRole | null | undefined;
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone_number ||
    "Staff member";
  useLockBodyScroll(open);

  const nav = (
    <aside className="flex h-full w-[272px] flex-col border-r border-crease bg-white text-ink-soft">
      <div className="flex h-20 items-center gap-3 border-b border-crease px-5">
        <Link
          href="/"
          aria-label="WEDEMBOYZ — back to home page"
          className="flex min-w-0 items-center gap-3"
        >
          <Image
            src="/icon-mark.png"
            alt=""
            width={38}
            height={46}
            priority
            className="h-11 w-auto"
          />
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight">
              WEDEMBOYZ
            </p>
            <p className="text-xs text-ink-muted">Operations console</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-md p-2 text-ink-muted hover:bg-dashboard-blue-50 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="flex-1 space-y-7 overflow-y-auto px-3 py-5"
        aria-label="Admin navigation"
      >
        {GROUPS.map((group) => {
          const visible = group.links.filter((link) =>
            canAccess(permissions, link.permission),
          );
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                {group.label}
              </p>
              <div className="space-y-1">
                {visible.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/admin"
                      ? pathname === href
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-dashboard-blue text-white shadow-nav-active" : "text-ink-soft hover:bg-dashboard-blue-50 hover:text-dashboard-blue"}`}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-crease p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-mist p-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-gold text-sm font-bold text-navy">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-soft">
              {name}
            </p>
            <p className="text-xs font-medium text-dashboard-blue">
              {role ? ROLE_LABELS[role] : "Staff"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-ink-muted hover:text-dashboard-blue"
          >
            Customer view
          </Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );

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
        <span className="ml-3 font-display font-semibold text-navy">Admin</span>
      </div>
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        {nav}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-navy/45"
            onClick={() => setOpen(false)}
            aria-label="Close navigation backdrop"
          />
          <div className="relative h-full w-[272px] shadow-2xl">{nav}</div>
        </div>
      )}
    </>
  );
}
