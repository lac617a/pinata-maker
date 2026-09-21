import Link from "next/link";
import { redirect } from "next/navigation";

import { DataAuthorizationGate } from "@/components/session/data-authorization-gate";
import { SignOutButton } from "@/components/session/sign-out-button";
import { mustAcceptDataPolicy } from "@/presentation/next/data-authorization-context";
import { PRIVATE_PAGE_METADATA } from "@/presentation/next/public-pages";
import { readSessionUserId } from "@/presentation/next/supabase";

/** El panel de proyectos no se indexa (AC-23). */
export const metadata = PRIVATE_PAGE_METADATA;

/**
 * Todo lo que cuelga de `/proyectos` exige sesión.
 *
 * La comprobación es de servidor: una guarda en el navegador solo esconde
 * los enlaces. Quien de verdad protege los datos es la API, que responde 401
 * sin sesión y 404 ante lo ajeno; esto solo evita enseñar una pantalla vacía
 * a quien no ha entrado.
 */
export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await readSessionUserId();

  if (!userId) {
    redirect("/acceder");
  }

  // An account without the current data authorization accepts it once,
  // before anything it stores is shown (docs/legal.md §7).
  const mustAccept = await mustAcceptDataPolicy(userId);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/proyectos" className="font-serif text-xl">
          Piñata Maker
        </Link>
        <SignOutButton />
      </header>
      {mustAccept ? <DataAuthorizationGate /> : children}
    </div>
  );
}
