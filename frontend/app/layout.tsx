import type { Metadata, Viewport } from "next";

import { Providers } from "@/src/components/providers/Providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Wedemboyz Lavomatique",
  description: "Laundry pickup and delivery for Yaounde.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
