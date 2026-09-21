import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SITE_OWNER } from "@/components/legal/site-owner";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Política de privacidad · Piñata Maker",
  description:
    "Qué datos recoge Piñata Maker, para qué, dónde se guardan y cuánto tiempo.",
  path: "/privacidad",
});

/**
 * Política de privacidad (docs/PRD.md §41).
 *
 * Describe lo que el sistema hace de verdad: si cambia qué se guarda o
 * quién interviene, esta página cambia con ello (docs/legal.md §3).
 */
export default function Page() {
  return (
    <LegalPage title="Política de privacidad">
      <LegalSection title="Quién es el responsable">
        <p>
          {SITE_OWNER.name} ({SITE_OWNER.taxId}), {SITE_OWNER.address},{" "}
          {SITE_OWNER.country}. Puedes escribirnos a {SITE_OWNER.email} para
          cualquier cosa relacionada con tus datos.
        </p>
      </LegalSection>

      <LegalSection title="Qué datos recogemos">
        <p>
          <strong>Si usas la herramienta sin cuenta:</strong>
        </p>
        <ul>
          <li>
            La imagen que eliges. Viaja a nuestro servidor solo para generar el
            PDF, se procesa en memoria y <strong>no se guarda</strong>: ni la
            imagen ni el PDF quedan almacenados.
          </li>
          <li>
            Un identificador aleatorio en una cookie (<code>pm_visitor</code>) y
            tu dirección IP, para contar cuántos PDF has generado hoy. No se
            guardan tal cual: guardamos una huella cifrada con una clave
            secreta, y la de la IP cambia cada día, así que no se puede
            relacionar un día con otro.
          </li>
        </ul>
        <p>
          <strong>Si creas una cuenta, además:</strong>
        </p>
        <ul>
          <li>
            Tu correo electrónico y tu contraseña, que nunca se guarda tal cual:
            solo una huella de la que no se puede recuperar.
          </li>
          <li>
            Tus proyectos: su nombre, las imágenes que subes y los PDF que
            generas, con sus fechas y medidas.
          </li>
          <li>Cuántos PDF has generado cada día, asociado a tu cuenta.</li>
        </ul>
        <p>
          No pedimos tu nombre, tu dirección ni ningún dato de pago, y no usamos
          tus imágenes para nada que no sea generar tus PDF.
        </p>
      </LegalSection>

      <LegalSection title="Para qué y con qué base">
        <ul>
          <li>
            <strong>Prestarte el servicio</strong> —generar los PDF, guardar tus
            proyectos si tienes cuenta—: es lo que nos pides al usar la
            herramienta y aceptar los términos.
          </li>
          <li>
            <strong>Aplicar el límite diario</strong> y evitar abusos: interés
            legítimo en que la herramienta siga siendo gratuita para todos.
          </li>
          <li>
            <strong>Publicidad:</strong> hoy el sitio no muestra publicidad. Si
            la añadimos, te pediremos permiso antes para la personalizada y
            podrás negarte (ver la{" "}
            <Link href="/cookies" className="underline underline-offset-4">
              política de cookies
            </Link>
            ).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Dónde se guardan y quién interviene">
        <ul>
          <li>
            <strong>Supabase</strong> gestiona el inicio de sesión, la base de
            datos y el almacenamiento de imágenes y PDF, en{" "}
            {SITE_OWNER.dataRegion}. Los archivos están en almacenamiento
            privado: solo se pueden descargar con un enlace temporal que genera
            la aplicación para su dueño.
          </li>
          <li>
            <strong>{SITE_OWNER.hosting}</strong> aloja la aplicación.
          </li>
        </ul>
        <p>
          No usamos ningún servicio externo para procesar tus imágenes: el PDF
          se genera en nuestro propio servidor. No vendemos ni cedemos tus datos
          a nadie.
        </p>
        <p>
          Si estos proveedores están fuera de {SITE_OWNER.country}, tus datos se
          transfieren allí con las garantías que ofrecen sus contratos de
          tratamiento de datos.
        </p>
      </LegalSection>

      <LegalSection title="Cuánto tiempo los conservamos">
        <ul>
          <li>Sin cuenta: la imagen y el PDF, nada; no se guardan.</li>
          <li>
            El contador diario: se borra a los siete días, con la huella de la
            cookie o de la IP.
          </li>
          <li>
            Con cuenta: tus imágenes y PDF, hasta que los borres o nos pidas
            borrar la cuenta. Puedes borrar cada imagen y cada PDF desde tu
            proyecto; se borran el registro y el archivo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Puedes pedirnos acceder a tus datos, corregirlos, borrarlos,
          llevártelos, limitar su uso u oponerte a él. Para borrar tu cuenta con
          todo lo que contiene, escríbenos a {SITE_OWNER.email} desde el correo
          de la cuenta y lo haremos en un máximo de 30 días.
        </p>
        <p>
          Si crees que no hemos tratado bien tus datos, puedes reclamar ante{" "}
          {SITE_OWNER.dataAuthority}.
        </p>
      </LegalSection>

      <LegalSection title="Menores">
        <p>
          El servicio no está pensado para menores de 16 años sin la supervisión
          de su madre, padre o tutor, que es quien debe crear la cuenta si hace
          falta.
        </p>
      </LegalSection>

      <LegalSection title="Cambios">
        <p>
          Si cambiamos qué datos recogemos o para qué, actualizaremos esta
          página y su fecha. Si el cambio es importante y tienes cuenta, te lo
          diremos por correo.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
