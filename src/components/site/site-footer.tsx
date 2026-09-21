import Link from "next/link";

/** Las cuatro páginas legales, en el pie de todas (docs/PRD.md §41, AC-19). */
export const LEGAL_LINKS = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/cookies", label: "Cookies" },
  { href: "/aviso-legal", label: "Aviso legal" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
        <p>
          Piñata Maker · Tu imagen a tamaño piñata ·{" "}
          <Link
            href="/guias"
            className="hover:text-foreground underline-offset-4 hover:underline"
          >
            Guías
          </Link>
        </p>
        <nav aria-label="Páginas legales">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
