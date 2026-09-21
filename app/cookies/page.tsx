import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de cookies · Piñata Maker",
  description: "Qué cookies usa Piñata Maker y para qué.",
  alternates: { canonical: "/cookies" },
};

/**
 * Política de cookies (docs/PRD.md §41).
 *
 * Hoy solo hay cookies necesarias. Cuando entre la publicidad, esta página
 * y el aviso de consentimiento llegan juntos (docs/legal.md §4).
 */
export default function Page() {
  return (
    <LegalPage title="Política de cookies">
      <LegalSection title="Qué son">
        <p>
          Pequeños archivos que el sitio guarda en tu navegador para reconocerte
          entre una visita y otra.
        </p>
      </LegalSection>

      <LegalSection title="Las que usamos">
        <p>
          Hoy solo usamos cookies <strong>necesarias</strong> para que la
          herramienta funcione. No requieren tu consentimiento y no sirven para
          publicidad ni para seguirte por otros sitios.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-foreground">
              <tr className="border-border border-b">
                <th className="py-2 pr-4 font-medium">Cookie</th>
                <th className="py-2 pr-4 font-medium">Para qué</th>
                <th className="py-2 font-medium">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border border-b align-top">
                <td className="py-2 pr-4">
                  <code>pm_visitor</code>
                </td>
                <td className="py-2 pr-4">
                  Contar cuántos PDF has generado hoy sin cuenta. Es un número
                  al azar, no dice quién eres.
                </td>
                <td className="py-2">1 año</td>
              </tr>
              <tr className="align-top">
                <td className="py-2 pr-4">
                  <code>sb-…-auth-token</code>
                </td>
                <td className="py-2 pr-4">
                  Mantener tu sesión iniciada si tienes cuenta.
                </td>
                <td className="py-2">Hasta que cierres sesión</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Publicidad">
        <p>
          Hoy el sitio no muestra publicidad ni usa cookies de terceros. Si en
          el futuro mostramos anuncios de Google AdSense, antes de cargar
          cualquier cookie publicitaria te preguntaremos, podrás rechazar la
          publicidad personalizada y cambiar de opinión cuando quieras. Esta
          página se actualizará entonces con esas cookies. Los anuncios nunca
          aparecerán dentro de los PDF.
        </p>
      </LegalSection>

      <LegalSection title="Cómo borrarlas">
        <p>
          Puedes borrar las cookies desde la configuración de tu navegador. Si
          borras <code>pm_visitor</code>, el límite diario se sigue contando por
          otros medios; si borras la de sesión, tendrás que volver a entrar.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
