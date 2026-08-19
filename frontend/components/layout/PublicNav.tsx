"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/lib/stores/auth.store";
import Image from "next/image";

export function PublicNav() {
    const [open, setOpen] = useState(false);
    const { accessToken, isHydrated } = useAuthStore();
    const isAuthenticated = !!accessToken;

    return (
        <div className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

                <Link
                    href="/"
                    className="flex items-center font-display text-base font-bold tracking-tight text-navy"
                >
                    <Image style={{ width: "auto", height: "auto"} } src="/icon-mark.png" alt="WEDEMBOYZ logo" width={40} height={50} priority />
                    WEDEMBOYZ
                </Link>
                <div className="font-display hidden items-center gap-8 text-sm text-ink-muted md:flex">
                    <Link href="/pricing" className="transition-colors hover:text-ink">
                        Pricing
                    </Link>
                    <Link href="/contact" className="transition-colors hover:text-ink">
                        Contact
                    </Link>
                </div>

                {isHydrated && (
                    <div className="font-display hidden justify-end items-center gap-3 md:flex">
                        {isAuthenticated ? (
                            <Link href="/dashboard">
                                <Button variant="gold">Dashboard</Button>
                            </Link>
                        ) : (
                            <>
                                <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
                                    Log in
                                </Link>

                                <Link href="/register">
                                    <Button>Get started</Button>
                                </Link>
                            </>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-navy md:hidden"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-label={open ? "Close menu" : "Open menu"}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>

            <div aria-hidden="true">
                <div className="h-px bg-crease" />
                <div className="mt-[3px] h-px bg-crease" />
            </div>

            {open && (
                <div className="border-t border-crease px-6 py-5 md:hidden">
                    <div className="font-display flex flex-col gap-4 text-sm text-ink-muted">
                        <Link href="/pricing" onClick={() => setOpen(false)} className="hover:text-ink">
                            Pricing
                        </Link>
                        <Link href="/contact" onClick={() => setOpen(false)} className="hover:text-ink">
                            Contact
                        </Link>
                        {isHydrated && (
                            <div className="flex justify-end items-center gap-3">
                                {isAuthenticated ? (
                                    <Link href="/dashboard" onClick={() => setOpen(false)}>
                                        <Button variant="gold">Dashboard</Button>
                                    </Link>
                                ) : (
                                    <Link href="/register" onClick={() => setOpen(false)} className="w-full">
                                        <Button className="w-full">Get started</Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
