import type { Metadata } from "next";
import Link from "next/link";

import { PinataPartsDiagram } from "@/components/guides/diagrams";
import {
  GuideArticle,
  GuideFigure,
  GuideNote,
  GuideStep,
} from "@/components/guides/guide-article";
import { guideBySlug, guidePath } from "@/components/guides/guides";
import { publicPageMetadata } from "@/presentation/next/public-pages";

const guide = guideBySlug("como-hacer-una-pinata-de-carton");

export const metadata: Metadata = publicPageMetadata({
  title: `${guide.title} · Piñata Maker`,
  description: guide.description,
  path: guidePath(guide),
});

/**
 * Making a box piñata from any image (docs/seo.md §6). The tool gives the
 * front at real size; the guide covers what the tool does not: the back,
 * the side strip and closing it with the sweets inside.
 */
export default function Page() {
  return (
    <GuideArticle guide={guide}>
      <p className="text-lg leading-relaxed">
        La forma más sencilla de hacer una piñata con la figura que quieras —un
        número, un personaje, una estrella— es la piñata de caja: dos caras de
        cartón con la forma de la figura y una tira lateral que les da volumen.
        La parte difícil siempre ha sido dibujar la figura en grande. Con tu
        imagen impresa a tamaño real, esa parte ya está hecha.
      </p>

      <GuideStep title="Lo que necesitas">
        <ul>
          <li>Tu imagen impresa en hojas y unida (el PDF de Piñata Maker).</li>
          <li>
            Cartón: cajas grandes de mudanza o de electrodomésticos. Cartón
            corrugado de una capa: aguanta y se corta bien.
          </li>
          <li>Cúter y tijeras, y una regla larga.</li>
          <li>
            Cola blanca o engrudo para pegar el póster, y cinta de papel para
            armar.
          </li>
          <li>Papel crepé o de seda para decorar, si quieres.</li>
          <li>Cuerda para colgarla y, claro, los dulces.</li>
        </ul>
      </GuideStep>

      <GuideStep number={1} title="Elige una buena imagen">
        <ul>
          <li>
            <strong>Una silueta clara:</strong> la vas a recortar con cúter.
            Partes muy finas, como dedos separados o antenas, se doblan y se
            rompen; mejor si la figura es compacta.
          </li>
          <li>
            <strong>Resolución suficiente.</strong> Al crear el PDF, la
            herramienta te dice si se va a ver pixelada al tamaño que elegiste y
            hasta dónde sale nítida. Una piñata se mira desde uno o dos metros:
            no hace falta calidad de fotografía.
          </li>
          <li>
            Si solo quieres una parte de la imagen, <strong>recórtala</strong>{" "}
            en la herramienta antes de elegir el tamaño.
          </li>
        </ul>
      </GuideStep>

      <GuideStep number={2} title="Decide cuánto mide">
        <p>
          Entre 50 y 80 cm de alto es el tamaño habitual: se ve bien colgada y
          cabe una buena cantidad de dulces. Un número de cumpleaños de 60 a 70
          cm funciona muy bien.
        </p>
        <p>
          Elige el ancho con los botones de <strong>hojas de ancho</strong>: son
          las medidas que llenan hojas enteras, para no imprimir una columna
          casi en blanco. La herramienta te dice al momento cuántas hojas salen.
        </p>
      </GuideStep>

      <GuideStep number={3} title="Imprime y une las hojas">
        <p>
          Imprime a tamaño real, comprueba la regla de 10 cm de la primera hoja
          y une las hojas por las cruces siguiendo el mapa. Lo tienes paso a
          paso en{" "}
          <Link
            href="/guias/como-imprimir-y-unir-las-hojas"
            className="underline underline-offset-4"
          >
            cómo imprimir y unir las hojas
          </Link>
          .
        </p>
      </GuideStep>

      <GuideStep number={4} title="Las tres partes de la piñata">
        <GuideFigure caption="El frente lleva tu imagen; la espalda es el mismo contorno dado la vuelta; la tira lateral une las dos y da el grosor.">
          <PinataPartsDiagram />
        </GuideFigure>
      </GuideStep>

      <GuideStep
        number={5}
        title="Pega el póster sobre cartón y recorta el frente"
      >
        <ol>
          <li>
            Extiende cola blanca rebajada con un poco de agua, o engrudo, sobre
            el cartón.
          </li>
          <li>
            Coloca el póster encima y alísalo desde el centro hacia los bordes
            para que no queden burbujas. Deja secar con peso encima, unos libros
            sirven.
          </li>
          <li>
            Recorta por el contorno de la figura con el cúter, en varias pasadas
            suaves en vez de una fuerte. Las curvas cerradas, mejor con tijera.
          </li>
        </ol>
      </GuideStep>

      <GuideStep number={6} title="Recorta la espalda">
        <p>
          No hace falta imprimirla. Pon el frente ya recortado{" "}
          <strong>boca abajo</strong> sobre otro cartón, traza el contorno con
          lápiz y recórtalo. Queda en espejo, que es justo lo que necesitas: al
          juntarlas, las dos caras coinciden.
        </p>
      </GuideStep>

      <GuideStep number={7} title="Haz la tira lateral">
        <ul>
          <li>
            <strong>El ancho de la tira es el grosor de la piñata:</strong> de
            10 a 15 cm para una de 60 cm. Más grosor, más dulces, más peso.
          </li>
          <li>
            <strong>El largo es el contorno de la figura.</strong> No hace falta
            que sea de una pieza: une varias tiras con cinta.
          </li>
          <li>
            Añade <strong>pestañas de unos 2 cm</strong> a los dos bordes, una
            cada 5 cm, y dóblalas hacia dentro. En las curvas, pestañas más
            juntas y más estrechas: así la tira se adapta sin arrugarse.
          </li>
          <li>
            Marca los pliegues de la tira en cada esquina de la figura: con la
            regla y pasando el cúter sin cortar, se doblan limpios.
          </li>
        </ul>
      </GuideStep>

      <GuideStep number={8} title="Arma, rellena y cierra">
        <ol>
          <li>
            Pega la tira al frente, por detrás, con cinta sobre las pestañas.
          </li>
          <li>
            Antes de cerrar, pasa la cuerda por la parte de arriba: atraviesa el
            cartón en dos puntos y refuerza por dentro con cinta en cruz. Es lo
            que va a aguantar los golpes.
          </li>
          <li>
            Deja una ventana en la espalda, una tapa recortada en tres lados,
            para meter los dulces al final.
          </li>
          <li>Pega la espalda a las pestañas del otro borde de la tira.</li>
          <li>Rellena por la ventana y ciérrala con cinta.</li>
        </ol>
        <GuideNote>
          <strong>Ojo con el peso.</strong> Un kilo de dulces es mucho para una
          piñata de 60 cm. Si la vas a golpear, reparte el peso y refuerza la
          cuerda; si es decorativa, puedes rellenarla con menos.
        </GuideNote>
      </GuideStep>

      <GuideStep number={9} title="Decora">
        <p>
          El frente ya está decorado: es tu imagen. Para la tira lateral y la
          espalda, lo clásico son flecos de papel crepé pegados de abajo hacia
          arriba, cada fila tapando el pegamento de la anterior. Si prefieres
          que se vea el cartón, una capa de pintura acrílica también queda bien.
        </p>
      </GuideStep>
    </GuideArticle>
  );
}
