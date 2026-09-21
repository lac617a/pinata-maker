import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SITE_OWNER } from "@/components/legal/site-owner";

export const metadata: Metadata = {
  title: "Términos de uso · Piñata Maker",
  description: "Las condiciones para usar Piñata Maker.",
  alternates: { canonical: "/terminos" },
};

/** Términos y condiciones de uso (docs/PRD.md §41). */
export default function Page() {
  return (
    <LegalPage title="Términos y condiciones de uso">
      <LegalSection title="Qué es Piñata Maker">
        <p>
          Una herramienta que amplía una imagen al tamaño que eliges y la
          reparte en hojas para imprimirla, con un mapa para montarla. La ofrece{" "}
          {SITE_OWNER.name}. Al usarla aceptas estas condiciones; si no estás de
          acuerdo, no la uses.
        </p>
      </LegalSection>

      <LegalSection title="Uso gratuito y límites">
        <p>
          La herramienta es gratuita, con un número de PDF al día que depende de
          si tienes cuenta. Podemos cambiar esos límites, y avisaremos en la
          propia herramienta de cuántos te quedan. Intentar saltarse el límite
          de forma automatizada o masiva no está permitido.
        </p>
      </LegalSection>

      <LegalSection title="Tu cuenta">
        <p>
          Si creas una cuenta, eres responsable de mantener tu contraseña en
          secreto y de lo que se haga con ella. Puedes dejar de usarla cuando
          quieras y pedirnos que la borremos.
        </p>
      </LegalSection>

      <LegalSection title="Tus imágenes">
        <ul>
          <li>
            <strong>Siguen siendo tuyas.</strong> No adquirimos ningún derecho
            sobre las imágenes que subes ni sobre los PDF que generas.
          </li>
          <li>
            Nos das permiso únicamente para procesarlas con el fin de generar
            tus PDF y, si tienes cuenta, guardarlas para ti. No las publicamos
            ni las usamos para nada más.
          </li>
          <li>
            <strong>Declaras que tienes derecho a usarlas</strong>: que son
            tuyas o que tienes permiso de su autor. Muchos personajes y
            logotipos están protegidos; imprimirlos para una fiesta privada no
            es lo mismo que venderlos, y la responsabilidad de ese uso es tuya.
          </li>
          <li>
            No subas contenido ilegal, que vulnere derechos de otros o que
            incite al odio o a la violencia.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Lo que imprimes">
        <p>
          Hacemos lo posible para que el PDF salga a tamaño real, y por eso
          incluye una regla de calibración: comprueba que mide 10 cm antes de
          imprimir el resto. El resultado depende también de tu impresora, de
          sus ajustes y del papel, que no controlamos.
        </p>
        <p>
          Recortar cartón implica herramientas con filo: úsalas con cuidado y,
          si trabajan menores, bajo supervisión de un adulto.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilidad">
        <p>
          La herramienta se ofrece tal como es, sin garantía de que esté siempre
          disponible o libre de errores. En la medida en que la ley lo permita,
          no respondemos de daños indirectos como papel o tinta gastados por un
          documento mal impreso. Nada de esto limita los derechos que te
          reconozca la ley como consumidor.
        </p>
      </LegalSection>

      <LegalSection title="Cambios y ley aplicable">
        <p>
          Podemos actualizar estas condiciones; la fecha de arriba dice cuándo
          fue la última vez. Se rigen por la ley de {SITE_OWNER.country}. Para
          cualquier duda, escríbenos a {SITE_OWNER.email}. Cómo tratamos tus
          datos está en la{" "}
          <Link href="/privacidad" className="underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
