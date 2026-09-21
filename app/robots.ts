import type { MetadataRoute } from "next";

import { readSiteUrl } from "@/infrastructure/site-url";

/**
 * Qué puede rastrear un buscador.
 *
 * `/proyectos` no se bloquea aquí a propósito: si se bloquea, el buscador no
 * puede leer su `noindex` y aún podría listar la URL sin contenido si alguien
 * la enlaza. Lo protegen su `noindex` y que sin sesión redirige a entrar
 * (docs/seo.md §3, AC-23). La API no es una página: esa sí se bloquea.
 */
export default function robots(): MetadataRoute.Robots {
  const site = readSiteUrl();

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
