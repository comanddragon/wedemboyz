"use client";

import { useQuery } from "@tanstack/react-query";
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
  Trophy,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { CustomerAvatar } from "@/src/components/chat/CustomerAvatar";
import { useLockBodyScroll } from "@/src/hooks/useLockBodyScroll";
import { chatApi, notificationsApi, ordersApi, paymentsApi, profileApi } from "@/src/lib/api";
import {
  canAccess,
  ROLE_LABELS,
  type AdminPermission,
  type AdminRole,
} from "@/src/lib/admin-rbac";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { queryKeys } from "@/src/lib/query-keys";
import { stripLocale } from "@/src/i18n/config";
import { useI18n } from "@/src/i18n/I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: AdminPermission;
  superuserOnly?: boolean;
  ambassadorOnly?: boolean;
  badgeCount?: number;
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
    href: "/admin/loyalty",
    label: "Loyalty",
    icon: Sparkles,
    permission: "loyalty.manage",
  },
  {
    href: "/admin/ambassadors",
    label: "Ambassadors",
    icon: Users,
    superuserOnly: true,
  },
  {
    href: "/ambassadors",
    label: "Leaderboard",
    icon: Trophy,
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
  {
    href: "/ambassadors",
    label: "Leaderboard",
    icon: Users,
    ambassadorOnly: true,
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Links shown inline in the top bar; anything beyond this goes under "More" so the bar never scrolls. */
const MAX_INLINE = 7;

function NavMore({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { t } = useI18n();
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
        {t("common.more")}
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
          {items.map(({ href, label, icon: Icon, badgeCount }) => {
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
                {badgeCount ? (
                  <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${active ? "bg-white text-navy" : "bg-status-cancelled-text text-white"}`}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  pathname = stripLocale(pathname);
  return (
    pathname === href ||
    (href !== "/admin" &&
      href !== "/dashboard" &&
      pathname.startsWith(`${href}/`))
  );
}

export function DashboardNav({ admin = false }: { admin?: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const permissions = user?.staff_permissions ?? [];
  const role = user?.staff_role as AdminRole | null | undefined;
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: profileApi.getProfile,
    enabled: isHydrated && Boolean(accessToken && user && !user.is_guest),
  });

  useEffect(() => {
    if (profile) {
      const currentUser = useAuthStore.getState().user;
      if (
        currentUser &&
        (currentUser.is_ambassador !== profile.is_ambassador ||
          currentUser.avatar !== profile.avatar ||
          currentUser.use_profile_photo !== profile.use_profile_photo)
      ) {
        useAuthStore.getState().setUser({
          is_ambassador: profile.is_ambassador,
          avatar: profile.avatar,
          use_profile_photo: profile.use_profile_photo,
        });
      }
    }
  }, [profile]);

  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.phone_number ||
    (admin ? t("common.staff") : t("common.customer"));
  const avatarUrl = profile?.avatar ?? user?.avatar;
  const isAmbassador = Boolean(profile?.is_ambassador ?? user?.is_ambassador);
  const needsAmbassadorPhoto = !admin && isAmbassador && !avatarUrl;
  const labelKeys: Record<string, string> = {
    Dashboard: "nav.dashboard", "Quick sale": "nav.quickSale", Orders: "nav.orders", Customers: "nav.customers", Inventory: "nav.inventory", Payments: "nav.payments", Analytics: "nav.analytics", Inbox: "nav.inbox", Staff: "nav.staff", Payroll: "nav.payroll", Discounts: "nav.discounts", Loyalty: "nav.loyalty", Ambassadors: "nav.ambassadors", Credit: "nav.credit", "Book pickup": "nav.book", Support: "nav.support", Rewards: "nav.rewards", Leaderboard: "nav.leaderboard", Settings: "nav.settings",
  };
  const baseLinks = (admin ? ADMIN_LINKS : CUSTOMER_LINKS).filter((item) => {
    if (
      !admin &&
      user?.is_guest &&
      ["/payments", "/loyalty", "/ambassadors", "/settings"].includes(item.href)
    ) return false;
    if (item.superuserOnly && !user?.is_superuser) return false;
    if (item.ambassadorOnly && !isAmbassador && !user?.is_staff) return false;
    return !item.permission || canAccess(permissions, item.permission);
  }).map((item) => ({ ...item, label: t(labelKeys[item.label] ?? item.label) }));
  const { data: chatRooms } = useQuery({
    queryKey: queryKeys.chat.rooms,
    queryFn: () => chatApi.listChatRooms(),
    enabled: isHydrated && Boolean(accessToken && user),
    refetchInterval: 20_000,
  });
  const { data: unreadNotifications } = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => notificationsApi.listNotifications(1, false),
    enabled: isHydrated && Boolean(accessToken && user),
    refetchInterval: 30_000,
  });
  const { data: pendingOrders } = useQuery({
    queryKey: [...queryKeys.orders.all, "nav-pending", admin ? "admin" : "customer"],
    queryFn: () => ordersApi.listOrders(1, { status: "PENDING" }),
    enabled: isHydrated && Boolean(accessToken && user),
    refetchInterval: 30_000,
  });
  const canViewPayments = !admin || canAccess(permissions, "payments.view");
  const { data: pendingPayments } = useQuery({
    queryKey: ["payments", "nav-pending", admin ? "admin" : "customer"],
    queryFn: () => paymentsApi.listPayments(1, { status: "PENDING" }),
    enabled: isHydrated && Boolean(accessToken && user && canViewPayments && !user?.is_guest),
    refetchInterval: 30_000,
  });
  const attentionCount = unreadNotifications?.count ?? 0;
  const unreadChatCount =
    chatRooms?.reduce((total, room) => total + room.unread_count, 0) ?? 0;
  const links = baseLinks.map((item) => {
    const isLocked = needsAmbassadorPhoto && item.href !== "/settings";
    return {
      ...item,
      href: isLocked ? "/settings" : item.href,
      badgeCount:
        item.href === "/chat" || item.href === "/admin/chat"
          ? unreadChatCount
          : item.href === "/orders" || item.href === "/admin/orders"
            ? pendingOrders?.count ?? 0
            : item.href === "/payments" || item.href === "/admin/payments"
              ? pendingPayments?.count ?? 0
              : 0,
    };
  });
  const mobileLinks = admin
    ? links.filter((item) =>
        ["/admin", "/admin/quick-sale", "/admin/orders", "/admin/chat"].includes(item.href),
      )
    : links.filter((item) =>
        ["/dashboard", "/book", "/orders", "/chat", "/settings"].includes(item.href),
      );
  useLockBodyScroll(open);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!profileOpen) return;
    const closeProfile = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeProfile);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfile);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  return (
    <>
      {needsAmbassadorPhoto ? (
        <div className="bg-gold px-4 py-2.5 text-center text-xs font-semibold text-navy flex items-center justify-center gap-2 shadow-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
          <span>{t("nav.ambassadorPhotoBanner")}</span>
          <Link
            href="/settings"
            className="underline underline-offset-2 font-bold hover:text-navy-900 ml-1 inline-flex items-center"
          >
            {t("nav.uploadPhotoNow")} →
          </Link>
        </div>
      ) : null}
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
          {links.slice(0, MAX_INLINE).map(({ href, label, badgeCount }) => (
            <Link
              key={href}
              href={href}
              className={`relative shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${isActive(pathname, href) ? "bg-navy text-white" : "text-ink-soft hover:bg-steam hover:text-navy"}`}
            >
              {label}
              {badgeCount ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-cancelled-text px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </Link>
          ))}
          {links.length > MAX_INLINE && (
            <NavMore items={links.slice(MAX_INLINE)} pathname={pathname} />
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <div className="hidden xl:block"><LanguageSwitcher compact /></div>
          <Link
            href="/notifications"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-mist text-navy transition-colors hover:bg-gold-50 sm:bg-white/90 sm:shadow-float lg:h-10 lg:w-10"
            aria-label={`Open notifications${attentionCount > 0 ? `, ${attentionCount} unread` : ""}`}
          >
            <Bell className="h-4 w-4" />
            {attentionCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-cancelled-text px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">
                {attentionCount > 99 ? "99+" : attentionCount}
              </span>
            ) : null}
          </Link>
          <div ref={profileRef} className="relative hidden sm:block">
            <button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-haspopup="menu" className="flex h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-white/90 px-2 pr-3 text-navy shadow-float">
              <CustomerAvatar name={name} size="xs" imageUrl={profile?.avatar} useProfilePhoto={profile?.use_profile_photo} className="ring-0" />
              <span className="max-w-24 truncate text-xs font-semibold">
                {name}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-ink-muted transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            {profileOpen ? <div role="menu" className="absolute right-0 top-12 w-56 rounded-2xl border-0 bg-white/95 p-2 shadow-pop">
              <div className="flex items-center gap-3 border-b border-crease-soft px-3 py-2">
                <CustomerAvatar name={name} size="sm" imageUrl={profile?.avatar} useProfilePhoto={profile?.use_profile_photo} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">
                    {name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {admin && role
                      ? t(`adminCommon.roles.${role.toLowerCase()}`)
                      : user?.is_guest
                        ? t("adminCommon.guestAccount")
                        : t("adminCommon.customerAccount")}
                  </p>
                </div>
              </div>
              {user?.is_staff && (
                <Link
                  href={admin ? "/dashboard" : "/admin"}
                  className="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-mist"
                >
                  {admin ? t("adminCommon.customerView") : t("adminCommon.adminConsole")}
                </Link>
              )}
              <LogoutButton className="w-full justify-start" />
            </div> : null}
          </div>
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

      {mounted
        ? createPortal(
            <>
              <nav
                className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-crease/80 bg-white/95 px-2 pt-2 shadow-[0_-12px_32px_-20px_color-mix(in_srgb,var(--color-navy)_45%,transparent)] backdrop-blur-xl lg:hidden"
                aria-label={
                  admin ? "Admin quick navigation" : "Customer quick navigation"
                }
              >
                {mobileLinks.map(({ href, label, icon: Icon, badgeCount }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.68rem] font-semibold transition-colors ${active ? "bg-navy text-white" : "text-ink-muted active:bg-steam active:text-navy"}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        className={`h-[19px] w-[19px] ${active ? "text-gold" : ""}`}
                        aria-hidden="true"
                      />
                      {badgeCount ? (
                        <span className="absolute right-[22%] top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-cancelled-text px-1 text-[9px] font-bold text-white ring-2 ring-white">
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      ) : null}
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
                  {t("common.more")}
                </button>
              </nav>

              {open ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <button
                    className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
                    onClick={() => setOpen(false)}
                    aria-label="Close navigation"
                  />
                  <div className="mobile-safe-top mobile-safe-bottom absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col bg-white p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-lg font-bold text-navy">
                        Menu
                      </p>
                      <button
                        onClick={() => setOpen(false)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-mist text-navy"
                        aria-label="Close menu"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4"><LanguageSwitcher /></div>
                    <nav
                      className="mt-6 grid grid-cols-2 gap-2 overflow-y-auto"
                      aria-label="All navigation"
                    >
                      {links.map(({ href, label, icon: Icon, badgeCount }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive(pathname, href) ? "bg-navy text-white" : "bg-mist text-ink-soft active:bg-steam"}`}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                          {label}
                          {badgeCount ? (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-cancelled-text px-1 text-[10px] font-bold text-white">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </nav>
                    <div className="mt-auto border-t border-crease-soft pt-4">
                      {user?.is_staff && (
                        <Link
                          href={admin ? "/dashboard" : "/admin"}
                          onClick={() => setOpen(false)}
                          className="mb-3 flex min-h-12 items-center gap-3 rounded-xl bg-gold-50 px-3 py-3 text-sm font-semibold text-navy active:bg-steam"
                        >
                          {admin ? (
                            <LayoutDashboard className="h-[18px] w-[18px]" />
                          ) : (
                            <UserCog className="h-[18px] w-[18px]" />
                          )}
                          {admin ? t("adminCommon.customerView") : t("adminCommon.adminConsole")}
                        </Link>
                      )}
                      <div className="mb-2 flex items-center gap-3 px-2">
                        <CustomerAvatar name={name} size="sm" imageUrl={profile?.avatar} useProfilePhoto={profile?.use_profile_photo} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy">
                            {name}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {admin && role
                              ? t(`adminCommon.roles.${role.toLowerCase()}`)
                              : user?.is_guest
                                ? t("adminCommon.guestAccount")
                                : t("adminCommon.customerAccount")}
                          </p>
                        </div>
                      </div>
                      <LogoutButton className="w-full justify-start" />
                    </div>
                  </div>
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </>
  );
}
