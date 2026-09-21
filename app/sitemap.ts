import type { MetadataRoute } from "next";

import { readSiteUrl } from "@/infrastructure/site-url";
import { PUBLIC_PAGES } from "@/presentation/next/public-pages";

/** Generado, no escrito a mano (docs/PRD.md §42, docs/seo.md §3). */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = readSiteUrl();

  return PUBLIC_PAGES.map((page) => ({
    url: `${site}${page.path === "/" ? "" : page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
