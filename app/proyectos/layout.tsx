import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/session/sign-out-button";
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
  if (!(await readSessionUserId())) {
    redirect("/acceder");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/proyectos" className="font-serif text-xl">
          Piñata Maker
        </Link>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
