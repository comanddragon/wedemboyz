"use client";

import {
    Bell,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    MessageCircle,
    Package,
    Settings,
    ShoppingBag,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useAuthStore } from "@/lib/stores/auth.store";
import Image from "next/image";

const PRIMARY_LINKS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/book", label: "Book", icon: ShoppingBag },
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/loyalty", label: "Loyalty", icon: Sparkles },
];

const SECONDARY_LINKS = [
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings", label: "Settings", icon: Settings },
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
    icon: LucideIcon;
    isActive: boolean;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-sm transition-colors ${
                isActive
                    ? "font-medium text-navy"
                    : "text-ink-muted hover:text-ink"
            }`}
        >
            {/* Active rail */}
            <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-navy transition-opacity ${
                    isActive
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-30"
                }`}
            />

            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                    isActive
                        ? "bg-navy text-white"
                        : "bg-transparent text-ink-muted group-hover:bg-steam group-hover:text-ink"
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
        <Image style={{ width: "auto", height: "auto"} } src="/icon-mark.png" alt="" width={44} height={54} priority />
    );
}


export function CustomerNav() {
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    const { user, isHydrated } = useAuthStore();

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

    // Only the mobile drawer sits over a still-scrollable page — lock it
    // while open so the sidebar doesn't drag the body with it. Called before
    // the isHydrated early return below so hook order stays stable.
    useLockBodyScroll(isOpen && !isDesktop);

    if (!isHydrated) {
        return null; // or skeleton loader
    }
    const isLinkActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`);

    // Tapping a link on mobile should collapse the drawer; on desktop the
    // sidebar always stays expanded, so this is a no-op there.
    const closeOnMobile = () => {
        if (!isDesktop) setIsOpen(false);
    };


    // Collapsed sidebar — mobile only (desktop always renders the expanded nav).
    if (!isOpen) {
        return (
            <aside className="sticky top-0 z-40 flex h-dvh w-14 shrink-0 flex-col items-center border-r border-ink/10 bg-white py-4">

                <Link href="/" aria-label="WEDEMBOYZ" className="mb-6 shrink-0">
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
                                            ? "bg-navy text-white"
                                            : "text-ink-muted hover:bg-steam hover:text-ink"
                                    }`}
                                >
                                    <Icon className="h-[18px] w-[18px]" />
                                </Link>
                            );
                        })}
                    </div>

                    <div className="h-px w-6 shrink-0 bg-ink/10" />

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
                                            ? "bg-navy text-white"
                                            : "text-ink-muted hover:bg-steam hover:text-ink"
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
                    className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-white transition-colors hover:bg-steam hover:text-ink"
                >
                    <ChevronRight className="h-[18px] w-[18px]" />
                </button>

            </aside>
        );
    }


    return (
        <>
            {/* backdrop: mobile-only, dims content, click outside to close */}
            {!isDesktop && (
                <div
                    className="fixed inset-0 z-30 touch-none bg-ink/30"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`inset-y-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col border-r border-ink/10 bg-white ${
                    isDesktop ? "sticky top-0 shadow-none" : "fixed shadow-2xl"
                }`}
            >

                {/* Logo */}
                <div className="px-6 py-6">
                    <Link
                        href="/"
                        className="flex items-center gap-3"
                    >
                        <LogoMark />

                        <span className="font-display text-lg font-bold leading-none tracking-tight text-navy">
                            WEDEMBOYZ
                        </span>
                    </Link>
                </div>

                <div className="mx-6 h-px bg-ink/10" />

                {/* Navigation */}
                <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-6">

                    <div className="space-y-1">
                        {PRIMARY_LINKS.map((link) => (
                            <NavItem
                                key={link.href}
                                {...link}
                                isActive={isLinkActive(link.href)}
                                onNavigate={closeOnMobile}
                            />
                        ))}
                    </div>

                    <div className="space-y-1">

                        <p className="px-3.5 pb-1 font-display text-[11px] font-semibold uppercase tracking-wider text-ink-muted/60">
                            Preferences
                        </p>

                        {SECONDARY_LINKS.map((link) => (
                            <NavItem
                                key={link.href}
                                {...link}
                                isActive={isLinkActive(link.href)}
                                onNavigate={closeOnMobile}
                            />
                        ))}

                    </div>

                </nav>

                {/* Footer */}
                <div className="border-t border-ink/10 p-4 space-y-2">

                    {user?.is_staff && (
                        <Link
                            href="/admin"
                            onClick={closeOnMobile}
                            className="flex items-center gap-3 rounded-lg py-2 pl-3.5 pr-3 text-sm text-ink-muted transition-colors hover:bg-steam hover:text-ink"
                        >
                            Admin view
                        </Link>
                    )}

                    <div className="flex items-center justify-between gap-2">

                        <LogoutButton />

                        {/* Collapse control is mobile-only — desktop sidebar stays expanded. */}
                        {!isDesktop && (
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close sidebar"
                                aria-expanded={isOpen}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-white transition-colors hover:bg-steam hover:text-ink"
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