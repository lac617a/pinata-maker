import "./globals.css";

import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { Providers } from "@/presentation/client/providers";

export const metadata: Metadata = {
  title: "Piñata Maker",
  description:
    "Tu imagen ampliada a tamaño real y repartida en hojas para hacer piñatas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      {/* El pie va en todas las páginas: lleva las legales (AC-19). */}
      <body className="flex min-h-screen flex-col">
        <Providers>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
