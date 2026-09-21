import "./globals.css";

import type { Metadata } from "next";

import { Providers } from "@/presentation/client/providers";

export const metadata: Metadata = {
  title: "Piñata Maker",
  description: "Convierte imágenes en moldes imprimibles",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
