import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SITE_OWNER } from "@/components/legal/site-owner";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Aviso legal · Piñata Maker",
  description: "Quién está detrás de Piñata Maker y cómo contactar.",
  path: "/aviso-legal",
});

/** Aviso legal: la identidad del titular (docs/PRD.md §41). */
export default function Page() {
  return (
    <LegalPage title="Aviso legal">
      <LegalSection title="Titular del sitio">
        <ul>
          <li>Titular: {SITE_OWNER.name}</li>
          <li>Identificación: {SITE_OWNER.taxId}</li>
          <li>
            Dirección: {SITE_OWNER.address}, {SITE_OWNER.country}
          </li>
          <li>Contacto: {SITE_OWNER.email}</li>
        </ul>
      </LegalSection>

      <LegalSection title="Objeto">
        <p>
          Piñata Maker es una herramienta en línea para ampliar una imagen a
          tamaño real y repartirla en hojas imprimibles. Su uso se rige por los
          términos y condiciones y la política de privacidad del sitio.
        </p>
      </LegalSection>

      <LegalSection title="Propiedad intelectual">
        <p>
          El diseño, los textos y el código del sitio pertenecen a su titular.
          Las imágenes que suben los usuarios y los PDF que generan son de sus
          dueños, no del sitio.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilidad">
        <p>
          El titular no se hace responsable del uso que cada usuario haga de las
          imágenes que sube ni de los enlaces a sitios de terceros que puedan
          aparecer en esta web.
        </p>
      </LegalSection>

      <LegalSection title="Ley aplicable">
        <p>Este sitio se rige por la ley de {SITE_OWNER.country}.</p>
      </LegalSection>
    </LegalPage>
  );
}
