import {
  LEGAL_LAST_UPDATED,
  pendingOwnerFields,
} from "@/components/legal/site-owner";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Marco común de las páginas legales: título, fecha y, mientras falten
 * datos del titular, un aviso de borrador que no se puede pasar por alto.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pending = pendingOwnerFields();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl space-y-8 px-6 pt-4 pb-16">
        {pending.length > 0 ? (
          <div
            role="alert"
            className="border-destructive/40 text-destructive rounded-lg border p-4 text-sm"
          >
            <strong>Borrador.</strong> Faltan datos del titular del sitio:{" "}
            {pending.join(", ")}. Esta página no debe publicarse así; se
            rellenan en <code>src/components/legal/site-owner.ts</code>.
          </div>
        ) : null}

        <div className="space-y-2">
          <h1 className="font-serif text-3xl">{title}</h1>
          <p className="text-muted-foreground text-sm">
            Última actualización: {LEGAL_LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-6">{children}</div>
      </main>
    </>
  );
}

/** Una sección con su título. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl">{title}</h2>
      <div className="text-muted-foreground space-y-3 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
