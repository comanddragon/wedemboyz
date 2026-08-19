"use client";

import {
    BarChart3,
    Boxes,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    MessageCircle,
    Package,
    ShoppingBag,
    Tag,
    Users,
    UserCog,
    Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import Image from "next/image";

const PRIMARY_LINKS = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/quick-sale", label: "Quick sale", icon: ShoppingBag },
    { href: "/admin/orders", label: "Orders", icon: Package },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/chat", label: "Chat inbox", icon: MessageCircle },
];

const SECONDARY_LINKS = [
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/finance/credit", label: "Clients à crédit", icon: CreditCard },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/discounts", label: "Discounts", icon: Tag },
    { href: "/admin/staff", label: "Staff", icon: UserCog },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

/** Matches Tailwind's `md` breakpoint — sidebar defaults open above this. */
const DESKTOP_QUERY = "(min-width: 768px)";

function NavItem({
                     href,
                     label,
                     icon: Icon,
                     isActive,
                     onNavigate,
                 }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    isActive: boolean;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-sm transition-colors ${
                isActive
                    ? "font-medium text-white"
                    : "text-white/70 hover:text-white"
            }`}
        >
            {/* active rail */}
            <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-white transition-all ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                }`}
            />

            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                    isActive
                        ? "bg-white text-navy"
                        : "bg-transparent text-white/70 group-hover:bg-white/10 group-hover:text-white"
                }`}
            >
        <Icon className="h-[18px] w-[18px]" />
      </span>

            <span>{label}</span>
        </Link>
    );
}

function LogoMark() {
    return (
        <Image style={{ width: "auto", height: "auto"}} src="/icon-mark.png" alt="" width={44} height={54} priority />
    );
}

export function AdminNav() {
    const pathname = usePathname();
    // Starts closed so the very first mobile paint matches the collapsed
    // rail; the effect below immediately flips it open on desktop viewports
    // before the user can perceive the collapsed state.
    const [isOpen, setIsOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(DESKTOP_QUERY);
        const applyViewport = (matches: boolean) => {
            setIsDesktop(matches);
            // On desktop the sidebar always lays out expanded; on mobile it
            // starts collapsed and is purely user-toggled from here on.
            if (matches) setIsOpen(true);
        };
        applyViewport(mql.matches);

        const handleChange = (e: MediaQueryListEvent) => applyViewport(e.matches);
        mql.addEventListener("change", handleChange);
        return () => mql.removeEventListener("change", handleChange);
    }, []);

    const isLinkActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

    // Tapping a link on mobile should collapse the drawer; on desktop the
    // sidebar always stays expanded, so this is a no-op there.
    const closeOnMobile = () => {
        if (!isDesktop) setIsOpen(false);
    };

    // Only the mobile drawer sits over a still-scrollable page — lock it
    // while open so the sidebar doesn't drag the body with it.
    useLockBodyScroll(isOpen && !isDesktop);

    // Collapsed rail — mobile only (desktop always renders the expanded nav).
    if (!isOpen) {
        return (
            <aside className="sticky top-0 z-40 flex h-dvh w-14 shrink-0 flex-col items-center border-r border-ink/10 bg-navy-600 py-4">
                <Link href="/" aria-label="WEDEMBOYZ admin" className="mb-6 shrink-0">
                    <LogoMark />
                </Link>

                <nav className="flex flex-1 flex-col items-center gap-6 overflow-y-auto overscroll-contain">
                    <div className="flex flex-col items-center gap-2">
                        {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => {
                            const active = isLinkActive(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-label={label}
                                    title={label}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                                        active
                                            ? "bg-white text-navy"
                                            : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon className="h-[18px] w-[18px]" />
                                </Link>
                            );
                        })}
                    </div>

                    <div className="h-px w-6 shrink-0 bg-white/10" />

                    <div className="flex flex-col items-center gap-2">
                        {SECONDARY_LINKS.map(({ href, label, icon: Icon }) => {
                            const active = isLinkActive(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-label={label}
                                    title={label}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                                        active
                                            ? "bg-white text-navy"
                                            : "text-white/70 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <Icon className="h-[18px] w-[18px]" />
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open sidebar"
                    aria-expanded={false}
                    className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                    <ChevronRight className="h-[18px] w-[18px]" />
                </button>
            </aside>
        );
    }

    return (
        <>
            {/* backdrop: mobile-only, closes sidebar on outside click, dims content behind it */}
            {!isDesktop && (
                <div
                    className="fixed inset-0 z-30 touch-none bg-ink/30"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col border-r border-ink/10 bg-navy-600 ${
                    isDesktop ? "sticky top-0 shadow-none" : "fixed shadow-2xl"
                }`}
            >
                <div className="px-6 py-6">
                    <Link href="/" className="flex items-center gap-3">
                        <LogoMark />
                        <div className="leading-none">
                            <span className="block font-display text-lg font-bold tracking-tight text-white">WEDEMBOYZ</span>
                            <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wider text-white">
              Staff admin
            </span>
                        </div>
                    </Link>
                </div>

                <div className="mx-6 h-px bg-white/10" />

                {/* Nav Links */}
                <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-6">
                    <div className="space-y-1">
                        {PRIMARY_LINKS.map((link) => (
                            <NavItem key={link.href} {...link} isActive={isLinkActive(link.href)} onNavigate={closeOnMobile} />
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-3.5 pb-1 font-display text-[11px] font-semibold uppercase tracking-wider text-white">
                            Operations
                        </p>
                        {SECONDARY_LINKS.map((link) => (
                            <NavItem key={link.href} {...link} isActive={isLinkActive(link.href)} onNavigate={closeOnMobile} />
                        ))}
                    </div>
                </nav>

                <div className="mx-4 h-px bg-white/10" />

                {/* Footer */}
                <div className="space-y-1 p-4">
                    <Link
                        href="/dashboard"
                        onClick={closeOnMobile}
                        className="flex items-center gap-3 rounded-lg py-2 pl-3.5 pr-3 text-sm text-white transition-colors hover:bg-white/10 hover:text-white"
                    >
                        Customer view
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                        <LogoutButton />
                        {/* Collapse control is mobile-only — desktop sidebar stays expanded. */}
                        {!isDesktop && (
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close sidebar"
                                aria-expanded={true}
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-600 text-white transition-colors hover:bg-steam hover:text-ink"
                            >
                                <ChevronLeft className="h-[18px] w-[18px]" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}