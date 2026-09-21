import Link from "next/link";

import { Button } from "@/components/ui/button";
import { readSessionUserId } from "@/presentation/next/supabase";

export default async function Page() {
  const signedIn = Boolean(await readSessionUserId());

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <h1 className="font-serif text-5xl">Piñata Maker</h1>
        <p className="text-muted-foreground text-lg">
          Convierte una imagen en un póster a tamaño real, repartido en hojas
          con su mapa de montaje, listo para pegar sobre cartón y recortar.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/*
          La herramienta primero y sin cuenta (docs/PRD.md §38): registrarse
          antes de probarla echa a casi todo el que llega.
        */}
        <Button asChild size="lg">
          <Link href="/crear">
            {signedIn ? "Crear un póster" : "Crear un póster sin registrarte"}
          </Link>
        </Button>
        {signedIn ? (
          <Button asChild size="lg" variant="ghost">
            <Link href="/proyectos">Ir a mis proyectos</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" variant="ghost">
              <Link href="/crear-cuenta">Crear cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/acceder">Entrar</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
