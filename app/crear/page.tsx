import type { Metadata } from "next";
import Link from "next/link";

import { CreatePoster } from "@/components/posters/create-poster";
import { Button } from "@/components/ui/button";
import { readSessionUserId } from "@/presentation/next/supabase";

export const metadata: Metadata = {
  title: "Crear póster · Piñata Maker",
  description:
    "Amplía tu imagen a tamaño real y repártela en hojas para tu piñata, sin registrarte.",
};

/**
 * La herramienta sin cuenta (docs/PRD.md §38, AC-16).
 *
 * Pública a propósito: obligar a registrarse antes de ver si sirve pierde a
 * casi todo el que llega buscando. Con sesión funciona igual, y cuenta en el
 * cupo de su cuenta.
 */
export default async function Page() {
  const signedIn = Boolean(await readSessionUserId());

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between gap-4">
        <Link href="/" className="font-serif text-xl">
          Piñata Maker
        </Link>
        {signedIn ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/proyectos">Mis proyectos</Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/acceder">Entrar</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/crear-cuenta">Crear cuenta</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="space-y-10">
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
    </div>
  );
}
