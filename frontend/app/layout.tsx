import type { Metadata } from "next";

import { Providers } from "@/components/providers/Providers";
import { BubbleOverlay } from "@/components/effects/BubbleOverlay";

import "./globals.css";
import {SiteShell} from "@/components/layout/SiteShell";

export const metadata: Metadata = {
    title: "WEDEMBOYZ Lavomatique",
    description: "Laundry pickup and delivery for Yaounde.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="bg-paper font-sans text-ink antialiased">
        <BubbleOverlay />
        <Providers>
            <SiteShell>{children}</SiteShell></Providers>
        </body>
        </html>
    );
}