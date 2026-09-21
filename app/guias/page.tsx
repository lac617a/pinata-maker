import type { Metadata } from "next";
import Link from "next/link";

import { guidePath, GUIDES } from "@/components/guides/guides";
import { SiteHeader } from "@/components/site/site-header";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Guías para hacer piñatas · Piñata Maker",
  description:
    "Cómo hacer una piñata de cartón con tu imagen y cómo imprimir y unir las hojas a tamaño real, paso a paso.",
  path: "/guias",
});

/** The guides index (docs/seo.md §6). */
export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-10 px-6 pt-4 pb-16">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl">Guías</h1>
          <p className="text-muted-foreground text-lg">
            Todo lo que hace falta para pasar de una imagen a una piñata
            colgada.
          </p>
        </div>

        <ul className="space-y-6">
          {GUIDES.map((guide) => (
            <li
              key={guide.slug}
              className="border-border bg-card space-y-2 rounded-lg border p-6"
            >
              <h2 className="font-serif text-2xl">
                <Link
                  href={guidePath(guide)}
                  className="underline-offset-4 hover:underline"
                >
                  {guide.title}
                </Link>
              </h2>
              <p className="text-muted-foreground">{guide.description}</p>
              <p className="text-muted-foreground text-sm">
                {guide.minutes} min de lectura
              </p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
