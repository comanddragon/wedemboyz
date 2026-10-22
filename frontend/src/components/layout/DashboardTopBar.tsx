"use client";

import { Bell, MessageCircle, Search } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  admin: "Overview", orders: "Orders", payments: "Payments", customers: "Customers",
  inventory: "Inventory", analytics: "Analytics", payroll: "Payroll", staff: "Staff & access",
  discounts: "Discounts", chat: "Messages", dashboard: "Overview", book: "Book a pickup",
  loyalty: "Rewards", notifications: "Notifications", settings: "Settings", subscription: "Subscription",
};

export function DashboardTopBar({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const key = segments.at(-1) ?? (admin ? "admin" : "dashboard");
  const title = LABELS[key] ?? key.replace(/-/g, " ");

  return <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-crease bg-white px-8 lg:flex">
    <div><p className="font-display text-base font-semibold capitalize text-ink">{title}</p><p className="text-xs text-ink-muted">{admin ? "Operations workspace" : "Customer dashboard"}</p></div>
    <div className="flex items-center gap-2">
      <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-dashboard-blue-50 hover:text-dashboard-blue" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
      <Link href={admin ? "/admin/chat" : "/notifications"} className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-dashboard-blue-50 hover:text-dashboard-blue" aria-label={admin ? "Messages" : "Notifications"}>{admin ? <MessageCircle className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}<span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-coral" /></Link>
      <span className="ml-2 h-8 w-px bg-crease" />
      <span className="rounded-lg bg-dashboard-blue-50 px-3 py-2 text-xs font-semibold text-dashboard-blue">{admin ? "Admin console" : "My account"}</span>
    </div>
  </header>;
}
