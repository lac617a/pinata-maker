import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SITE_OWNER } from "@/components/legal/site-owner";
import { DATA_POLICY_VERSION } from "@/modules/accounts/data-authorization";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Política de tratamiento de datos personales · Piñata Maker",
  description:
    "Qué datos trata Piñata Maker, para qué, dónde se guardan, cuánto tiempo y cómo ejercer tus derechos según la Ley 1581 de 2012.",
  path: "/privacidad",
});

/**
 * The data policy, written for Colombian law: Ley 1581 de 2012 and its
 * regulation, Decreto 1377 de 2013 (now in Decreto 1074 de 2015). Art. 13 of
 * the decree lists what it must contain; every section here answers one of
 * those points.
 *
 * It describes what the system really does. If what is stored, for how long
 * or by whom changes, this page changes in the same commit, and so does
 * DATA_POLICY_VERSION if the change is substantial (docs/legal.md §3, §5).
 */
export default function Page() {
  return (
    <LegalPage title="Política de tratamiento de datos personales">
      <LegalSection title="1. Responsable del tratamiento">
        <ul>
          <li>
            <strong>Nombre:</strong> {SITE_OWNER.name}, identificado con
            documento {SITE_OWNER.taxId}.
          </li>
          <li>
            <strong>Domicilio y dirección:</strong> {SITE_OWNER.address}.
          </li>
          <li>
            <strong>Correo electrónico:</strong> {SITE_OWNER.email}
          </li>
          <li>
            <strong>Teléfono:</strong> {SITE_OWNER.phone}
          </li>
        </ul>
        <p>
          Esta política cumple la Ley 1581 de 2012 y el Decreto 1377 de 2013
          (compilado en el Decreto 1074 de 2015), que regulan la protección de
          datos personales en Colombia.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos tratamos y para qué">
        <p>
          <strong>Si usas la herramienta sin cuenta:</strong>
        </p>
        <ul>
          <li>
            <strong>La imagen que eliges.</strong> Viaja a nuestro servidor solo
            para generar el PDF, se procesa en memoria y{" "}
            <strong>no se guarda</strong>: ni la imagen ni el PDF quedan
            almacenados.
          </li>
          <li>
            <strong>Un identificador aleatorio y tu dirección IP,</strong> para
            contar cuántos PDF generas al día y evitar abusos. No se guardan tal
            cual: guardamos una huella cifrada con una clave secreta, y la de la
            IP cambia cada día, así que no permite seguirte de un día a otro.
          </li>
        </ul>
        <p>
          <strong>Si creas una cuenta, además:</strong>
        </p>
        <ul>
          <li>
            Tu correo electrónico, para identificarte y comunicarnos contigo
            sobre tu cuenta.
          </li>
          <li>
            Tu contraseña, que nunca se guarda tal cual: solo una huella de la
            que no se puede recuperar.
          </li>
          <li>
            Tus proyectos: su nombre, las imágenes que subes y los PDF que
            generas, con sus fechas y medidas, para que puedas volver a ellos.
          </li>
          <li>Cuántos PDF has generado cada día, para aplicar el límite.</li>
          <li>
            La prueba de tu autorización: qué versión de esta política aceptaste
            y cuándo.
          </li>
        </ul>
        <p>
          No pedimos datos sensibles ni datos de pago, no usamos tus imágenes
          para nada que no sea generar tus PDF y no vendemos ni cedemos tus
          datos a nadie.
        </p>
      </LegalSection>

      <LegalSection title="3. Tu autorización">
        <p>
          Al crear una cuenta marcas una casilla con la que autorizas este
          tratamiento, de forma previa, expresa e informada. Guardamos qué
          versión de la política aceptaste y cuándo, como prueba. Versión
          vigente: {DATA_POLICY_VERSION}.
        </p>
        <p>
          Sin cuenta, antes de descargar el PDF marcas una casilla con la que
          aceptas el tratamiento mínimo descrito arriba: la imagen solo mientras
          se genera el documento, y la huella del identificador y de la IP para
          el límite diario.
        </p>
        <p>Puedes revocar tu autorización en cualquier momento (sección 6).</p>
      </LegalSection>

      <LegalSection title="4. Dónde se guardan y quién interviene">
        <p>
          Usamos dos proveedores que tratan los datos por encargo nuestro y solo
          para prestar el servicio:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>: inicio de sesión, base de datos y
            almacenamiento de imágenes y PDF, en {SITE_OWNER.dataRegion}. Los
            archivos están en almacenamiento privado y solo se descargan con un
            enlace temporal que la aplicación genera para su dueño.
          </li>
          <li>
            <strong>{SITE_OWNER.hosting}</strong>: aloja la aplicación.
          </li>
        </ul>
        <p>
          Como están fuera de Colombia, tus datos se transmiten a Estados
          Unidos. Al autorizar esta política autorizas también esa transmisión,
          que se hace con las garantías de seguridad de sus contratos de
          tratamiento de datos.
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo los conservamos">
        <ul>
          <li>Sin cuenta: la imagen y el PDF, nada; no se guardan.</li>
          <li>El contador diario: se borra a los siete días.</li>
          <li>
            Con cuenta: tus datos, mientras la cuenta exista o hasta que los
            borres. Puedes borrar cada imagen, cada PDF, cada proyecto o la
            cuenta entera desde la aplicación; se borran los registros y los
            archivos.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>Como titular de los datos puedes, en cualquier momento:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que nos diste.</li>
          <li>Saber qué uso le hemos dado a tus datos.</li>
          <li>
            Revocar la autorización o pedir que borremos tus datos, cuando no
            haya un deber legal de conservarlos.
          </li>
          <li>Acceder a tus datos de forma gratuita.</li>
          <li>
            Presentar quejas ante {SITE_OWNER.dataAuthority} por infracciones a
            la ley, una vez hayas presentado tu reclamo ante nosotros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Cómo ejercerlos">
        <p>
          Escríbenos a <strong>{SITE_OWNER.email}</strong> o llama al{" "}
          <strong>{SITE_OWNER.phone}</strong>. Quien atiende las solicitudes es
          el propio responsable, {SITE_OWNER.name}. Si tienes cuenta, escribe
          desde el correo de la cuenta: así sabemos que eres tú.
        </p>
        <p>
          <strong>Consultas</strong> (qué datos tenemos, qué uso les damos): te
          respondemos en un máximo de diez días hábiles desde que la recibimos.
          Si no podemos en ese plazo, te diremos por qué y te responderemos en
          los cinco días hábiles siguientes.
        </p>
        <p>
          <strong>Reclamos</strong> (corregir, actualizar, borrar o revocar la
          autorización): incluye tu identificación, qué pides y por qué, cómo
          contactarte y los documentos que quieras aportar. Si falta algo, te lo
          pediremos en los cinco días siguientes; si pasan dos meses sin que lo
          completes, entenderemos que desististe. Te respondemos en un máximo de
          quince días hábiles. Si no podemos, te diremos por qué y te
          responderemos en los ocho días hábiles siguientes.
        </p>
        <p>
          <strong>Borrar tu cuenta</strong> con todos tus proyectos, imágenes y
          PDF lo puedes hacer tú mismo, en cualquier momento, desde «Tu cuenta»
          en Mis proyectos. Se borra al instante. También puedes pedírnoslo por
          correo.
        </p>
      </LegalSection>

      <LegalSection title="8. Seguridad">
        <p>
          Cada usuario solo puede ver sus propios proyectos, lo que se comprueba
          en la base de datos y no solo en la aplicación; las conexiones van
          cifradas y los archivos no son públicos. Ningún sistema es infalible:
          si detectamos un incidente que afecte a tus datos, te lo
          comunicaremos.
        </p>
      </LegalSection>

      <LegalSection title="9. Menores de edad">
        <p>
          El servicio no está dirigido a menores de edad. Si un menor lo usa, su
          madre, padre o representante legal es quien debe autorizar el
          tratamiento y crear la cuenta, respetando siempre el interés superior
          del menor.
        </p>
      </LegalSection>

      <LegalSection title="10. Vigencia y cambios">
        <p>
          Esta política rige desde el 21 de septiembre de 2026. Los datos se
          conservan mientras sean necesarios para las finalidades descritas o
          mientras tu cuenta exista. Si la cambiamos de forma sustancial, te lo
          avisaremos y te pediremos de nuevo tu autorización. Las cookies se
          explican en la{" "}
          <Link href="/cookies" className="underline underline-offset-4">
            política de cookies
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
