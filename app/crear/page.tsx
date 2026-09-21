import type { Metadata } from "next";

import { CreatePoster } from "@/components/posters/create-poster";
import { SiteHeader } from "@/components/site/site-header";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Crear póster · Piñata Maker",
  description:
    "Amplía tu imagen a tamaño real y repártela en hojas para tu piñata, sin registrarte.",
  path: "/crear",
});

/**
 * La herramienta sin cuenta (docs/PRD.md §38, AC-16).
 *
 * Pública a propósito: obligar a registrarse antes de ver si sirve pierde a
 * casi todo el que llega buscando. Con sesión funciona igual, y cuenta en el
 * cupo de su cuenta.
 */
export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl space-y-10 px-6 pt-4 pb-16">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl">Tu imagen, a tamaño piñata</h1>
          <p className="text-muted-foreground">
            Elige una imagen, recórtala si quieres y di cuánto mide. Te damos un
            PDF con la imagen ampliada y repartida en hojas, listo para
            imprimir, pegar sobre cartón y recortar.
          </p>
        </div>

        <CreatePoster />
      </main>
    </>
  );
}
