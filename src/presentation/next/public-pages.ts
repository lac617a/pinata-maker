import type { Metadata, MetadataRoute } from "next";

/**
 * Las páginas que deben encontrarse en buscadores (docs/PRD.md §42).
 *
 * Una sola lista para el sitemap: una página pública nueva se añade aquí y
 * aparece en él. Lo privado —proyectos, sesión, API— no está y además lleva
 * `noindex` (docs/seo.md §3).
 */
export const PUBLIC_PAGES: readonly {
  readonly path: string;
  readonly changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  readonly priority: number;
}[] = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/crear", changeFrequency: "monthly", priority: 0.9 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.2 },
  { path: "/aviso-legal", changeFrequency: "yearly", priority: 0.2 },
];

const SITE_NAME = "Piñata Maker";

/**
 * Metadatos de una página pública: título, descripción, URL canónica y
 * Open Graph, que es lo que enseñan WhatsApp o Facebook al compartir el
 * enlace. Relativos: `metadataBase` del layout raíz los completa.
 */
export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "es",
      type: "website",
    },
  };
}

/** Lo que no debe aparecer en buscadores (AC-23). */
export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false },
};
