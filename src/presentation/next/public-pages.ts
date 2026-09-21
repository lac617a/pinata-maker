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
 * The share picture, app/opengraph-image.tsx. Pages that declare their own
 * Open Graph replace the one inherited from the root, image included, so
 * every public page names it explicitly (docs/seo.md §5).
 */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Piñata Maker: tu imagen ampliada a tamaño real y repartida en hojas para imprimir",
} as const;

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
      images: [SHARE_IMAGE],
    },
  };
}

/** Lo que no debe aparecer en buscadores (AC-23). */
export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false },
};
