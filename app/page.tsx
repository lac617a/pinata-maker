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
          Convierte una imagen en un molde imprimible a tamaño real, repartido
          en hojas y listo para recortar.
        </p>
      </div>

      <div className="flex gap-3">
        {signedIn ? (
          <Button asChild>
            <Link href="/proyectos">Ir a mis proyectos</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/crear-cuenta">Crear cuenta</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/acceder">Entrar</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
