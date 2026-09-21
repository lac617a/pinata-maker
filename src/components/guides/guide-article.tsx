import Link from "next/link";

import { type Guide, guidePath, GUIDES } from "@/components/guides/guides";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { readSiteUrl } from "@/infrastructure/site-url";

/**
 * The frame every guide shares: breadcrumbs, title, reading time, the text,
 * a way to the tool and the other guides. Server-rendered, with Article and
 * BreadcrumbList structured data built from the same fields that are shown
 * (docs/seo.md §6).
 */
export function GuideArticle({
  guide,
  children,
}: {
  guide: Guide;
  children: React.ReactNode;
}) {
  const site = readSiteUrl();
  const others = GUIDES.filter((other) => other.slug !== guide.slug);
  const updated = new Date(`${guide.updated}T12:00:00Z`).toLocaleDateString(
    "es",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-10 px-6 pt-4 pb-16">
        <nav aria-label="Ruta" className="text-muted-foreground text-sm">
          <ol className="flex flex-wrap gap-2">
            <li>
              <Link href="/" className="hover:text-foreground hover:underline">
                Inicio
              </Link>{" "}
              ›
            </li>
            <li>
              <Link
                href="/guias"
                className="hover:text-foreground hover:underline"
              >
                Guías
              </Link>{" "}
              ›
            </li>
            <li aria-current="page">{guide.title}</li>
          </ol>
        </nav>

        <header className="space-y-4">
          <h1 className="font-serif text-4xl leading-tight">{guide.title}</h1>
          <p className="text-muted-foreground text-lg">{guide.description}</p>
          <p className="text-muted-foreground text-sm">
            {guide.minutes} min de lectura · Actualizada el {updated}
          </p>
        </header>

        <article className="space-y-10">{children}</article>

        <section className="border-border bg-card space-y-4 rounded-lg border p-6 text-center">
          <h2 className="font-serif text-2xl">Prepara tu plantilla</h2>
          <p className="text-muted-foreground">
            Sube tu imagen, elige cuánto mide y descarga el PDF listo para
            imprimir. Gratis y sin registrarte.
          </p>
          <Button asChild size="lg">
            <Link href="/crear">Crear mi póster</Link>
          </Button>
        </section>

        {others.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-serif text-2xl">Otras guías</h2>
            <ul className="space-y-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={guidePath(other)}
                    className="font-medium underline underline-offset-4"
                  >
                    {other.title}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {other.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: guide.title,
              description: guide.description,
              datePublished: guide.updated,
              dateModified: guide.updated,
              inLanguage: "es",
              mainEntityOfPage: `${site}${guidePath(guide)}`,
              image: `${site}/opengraph-image`,
              author: { "@type": "Organization", name: "Piñata Maker" },
              publisher: { "@type": "Organization", name: "Piñata Maker" },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { name: "Inicio", item: site },
                { name: "Guías", item: `${site}/guias` },
                { name: guide.title, item: `${site}${guidePath(guide)}` },
              ].map((crumb, index) => ({
                "@type": "ListItem",
                position: index + 1,
                ...crumb,
              })),
            },
          ]),
        }}
      />
    </>
  );
}

/** A numbered step with its heading. */
export function GuideStep({
  number,
  title,
  id,
  children,
}: {
  number?: number;
  title: string;
  /** Anchor to link straight to this step, e.g. from the tool. */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="font-serif text-2xl">
        {number !== undefined ? (
          <span className="text-muted-foreground mr-2 font-mono text-lg">
            {number}.
          </span>
        ) : null}
        {title}
      </h2>
      <div className="text-foreground/85 space-y-4 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

/** A drawing with its caption. */
export function GuideFigure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="border-border bg-card space-y-3 rounded-lg border p-5">
      {children}
      <figcaption className="text-muted-foreground text-sm">
        {caption}
      </figcaption>
    </figure>
  );
}

/** A short aside: a tip or a warning. */
export function GuideNote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="border-border bg-card rounded-lg border-l-4 p-4 text-sm">
      {children}
    </aside>
  );
}
