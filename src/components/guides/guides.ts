/**
 * The guides: indexable content beyond the landing (docs/PRD.md §42).
 *
 * One list for the index page, the sitemap and the links between guides. A
 * new guide is a page under app/guias/<slug>/ plus an entry here
 * (docs/seo.md §6).
 */
export type Guide = {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly minutes: number;
  /** ISO date of the last real change to the text. */
  readonly updated: string;
};

export const GUIDES: readonly Guide[] = [
  {
    slug: "como-hacer-una-pinata-de-carton",
    title: "Cómo hacer una piñata de cartón con tu imagen",
    description:
      "Paso a paso para convertir cualquier imagen en una piñata de cartón: el tamaño, la plantilla impresa, las dos caras, la tira lateral y cómo cerrarla con los dulces dentro.",
    minutes: 8,
    updated: "2026-09-21",
  },
  {
    slug: "como-imprimir-y-unir-las-hojas",
    title: "Cómo imprimir y unir las hojas de tu póster",
    description:
      "Cómo imprimir el PDF a tamaño real sin que la impresora lo encoja, cómo comprobarlo con la regla de 10 cm y cómo unir las hojas por las cruces siguiendo el mapa.",
    minutes: 5,
    updated: "2026-09-21",
  },
];

export function guidePath(guide: Guide): string {
  return `/guias/${guide.slug}`;
}

export function guideBySlug(slug: string): Guide {
  const guide = GUIDES.find((candidate) => candidate.slug === slug);

  if (!guide) {
    throw new Error(`There is no guide "${slug}".`);
  }

  return guide;
}
