import "./globals.css";

import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { readSiteUrl } from "@/infrastructure/site-url";
import { Providers } from "@/presentation/client/providers";

export const metadata: Metadata = {
  // Completa las URL relativas de canónicas y Open Graph (docs/seo.md §2).
  metadataBase: new URL(readSiteUrl()),
  title: "Piñata Maker",
  description:
    "Tu imagen ampliada a tamaño real y repartida en hojas para hacer piñatas.",
  // Large picture on X; the image itself is app/opengraph-image.tsx.
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      {/* El pie va en todas las páginas: lleva las legales (AC-19). */}
      {/*
        On a phone, when the floating download bar is on screen, the page
        leaves room for it after the footer (poster-studio.tsx).
      */}
      <body className="flex min-h-screen flex-col max-sm:has-[[data-floating-download]]:pb-28">
        <Providers>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
