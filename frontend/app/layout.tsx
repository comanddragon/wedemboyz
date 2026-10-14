import type { Metadata } from "next";

import { Providers } from "@/src/components/providers/Providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "WEDEMBOYZ Lavomatique",
  description: "Laundry pickup and delivery for Yaounde.",
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
