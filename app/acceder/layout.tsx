import type { Metadata } from "next";

import { PRIVATE_PAGE_METADATA } from "@/presentation/next/public-pages";

/**
 * La página es de cliente y no puede declarar metadatos: los pone su
 * layout. Un formulario de sesión no aporta nada a un buscador
 * (docs/seo.md §3).
 */
export const metadata: Metadata = {
  ...PRIVATE_PAGE_METADATA,
  title: "Entrar · Piñata Maker",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
