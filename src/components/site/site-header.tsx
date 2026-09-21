import Link from "next/link";

import { Button } from "@/components/ui/button";
import { readSessionUserId } from "@/presentation/next/supabase";

/**
 * Cabecera de las páginas públicas.
 *
 * La herramienta siempre a un clic, con o sin cuenta (docs/PRD.md §38).
 */
export async function SiteHeader() {
  const signedIn = Boolean(await readSessionUserId());

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/" className="font-serif text-xl whitespace-nowrap">
        Piñata Maker
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        {/* On a phone there is no room for three buttons; the guides stay
            one tap away in the footer and on the landing. */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Link href="/guias">Guías</Link>
        </Button>
        {signedIn ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/proyectos">Mis proyectos</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href="/acceder">Entrar</Link>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href="/crear">Crear póster</Link>
        </Button>
      </nav>
    </header>
  );
}
