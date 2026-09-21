import type { Metadata } from "next";
import Link from "next/link";

import {
  PrintScaleDiagram,
  RulerCheckDiagram,
  SheetMapDiagram,
  SheetOverlapDiagram,
  TrimJoinDiagram,
} from "@/components/guides/diagrams";
import {
  GuideArticle,
  GuideFigure,
  GuideNote,
  GuideStep,
} from "@/components/guides/guide-article";
import { guideBySlug, guidePath } from "@/components/guides/guides";
import { publicPageMetadata } from "@/presentation/next/public-pages";

const guide = guideBySlug("como-imprimir-y-unir-las-hojas");

export const metadata: Metadata = publicPageMetadata({
  title: `${guide.title} · Piñata Maker`,
  description: guide.description,
  path: guidePath(guide),
});

/**
 * Printing and joining the sheets (docs/seo.md §6). Every instruction
 * matches what the PDF prints: the 100 mm ruler on the summary sheet, the
 * 1 cm strip with crosses, labels with a row letter and a column number.
 */
export default function Page() {
  return (
    <GuideArticle guide={guide}>
      <p className="text-lg leading-relaxed">
        El PDF que descargas ya viene repartido en hojas del tamaño que
        elegiste. Solo hay dos cosas que pueden salir mal: que la impresora lo
        encoja o que las hojas se unan en otro orden. Esta guía evita las dos.
      </p>

      <GuideStep title="Qué trae el PDF">
        <ul>
          <li>
            <strong>La primera hoja es el resumen:</strong> el tamaño final, el
            papel, cuántas hojas son, el mapa de montaje con la etiqueta de cada
            hoja y una regla de 10 cm.
          </li>
          <li>
            <strong>Las demás son tu imagen en trozos.</strong> Cada una lleva
            su etiqueta al pie (A1, A2, B1…) y unas cruces cerca de los bordes
            para alinearlas con las vecinas.
          </li>
        </ul>
      </GuideStep>

      <GuideStep
        number={1}
        title="Imprime solo la primera hoja y mide la regla"
      >
        <p>
          Antes de gastar papel y tinta en todas, imprime la hoja de resumen y
          mide con una regla la línea de abajo. Tiene que medir exactamente{" "}
          <strong>10 cm</strong>.
        </p>
        <GuideFigure caption="La línea de 100 mm del PDF tiene que ir del 0 al 10 de tu regla.">
          <RulerCheckDiagram />
        </GuideFigure>
        <p>
          Si mide 9,5 o 9,7 cm, la impresora está encogiendo el documento. Con
          todas las hojas un poco más pequeñas, la figura no mide lo que pediste
          y las cruces no coinciden al unirlas. Corrige la escala (paso 2) y
          vuelve a medir.
        </p>
      </GuideStep>

      <GuideStep
        number={2}
        title="Imprime a tamaño real, sin «ajustar a página»"
      >
        <p>
          Casi todos los programas encogen por defecto el documento para que
          quepa con márgenes. Hay que decirles que no:
        </p>
        <GuideFigure caption="Con tamaño real la imagen llena la hoja hasta el margen; ajustada a la página sale más pequeña.">
          <PrintScaleDiagram />
        </GuideFigure>
        <ul>
          <li>
            <strong>Adobe Acrobat Reader:</strong> en «Tamaño y gestión de
            páginas», elige «Tamaño real».
          </li>
          <li>
            <strong>Chrome o Edge:</strong> en «Más opciones», busca «Escala» y
            elige «Personalizada» con 100.
          </li>
          <li>
            <strong>Vista Previa (Mac):</strong> escala al 100 %.
          </li>
          <li>
            <strong>Cualquier otro:</strong> busca la opción de escala y elige
            «Tamaño real», «100 %» o desactiva «Ajustar a la página».
          </li>
        </ul>
        <p>
          Usa el mismo papel que elegiste al crear el PDF (A4, A3 o Carta) y en
          vertical u horizontal según lo elegiste. El PDF deja un margen de 5 mm
          en cada borde, que cualquier impresora doméstica respeta: no hace
          falta imprimir sin bordes.
        </p>
      </GuideStep>

      <GuideStep number={3} title="Imprime el resto y ordénalas con el mapa">
        <p>
          Con la regla midiendo 10 cm, imprime todas las hojas. Después
          colócalas en la mesa como en el mapa de la primera hoja:
        </p>
        <GuideFigure caption="La letra es la fila, de arriba abajo; el número, la columna, de izquierda a derecha.">
          <SheetMapDiagram />
        </GuideFigure>
        <p>
          La etiqueta está al pie de cada hoja. La última fila o la última
          columna pueden salir con una parte en blanco: es donde termina la
          imagen, y van en su sitio igual.
        </p>
      </GuideStep>

      <GuideStep
        number={4}
        id="solapar-o-sin-solape"
        title="Solapar o sin solape: cuál elegir"
      >
        <p>
          Al crear el PDF eliges cómo se unen las hojas, en «Unión de las
          hojas». Las dos dan la misma figura; cambia cómo se pegan.
        </p>
        <ul>
          <li>
            <strong>Solapar 1 cm</strong> (la opción por defecto): cada hoja
            repite una franja de un centímetro de la de al lado. Se pegan
            superponiendo esa franja hasta que las cruces coinciden.{" "}
            <strong>No hay que cortar nada</strong> y perdona pequeños errores:
            es la más fácil si es tu primera vez.
          </li>
          <li>
            <strong>Sin solape</strong>, como Block Posters: no se repite
            ninguna franja. Recortas el margen blanco de las hojas siguiendo
            unas marcas en las esquinas y las juntas borde con borde.{" "}
            <strong>Salen menos hojas para el mismo tamaño</strong> (tres hojas
            A4 de ancho dan 60 cm en vez de 58), pero hay que cortar recto y con
            cuidado.
          </li>
        </ul>
        <p>
          Si dudas, solapa. Si ya has hecho pósters en hojas y tienes regla
          metálica y cúter, sin solape ahorra papel.
        </p>
      </GuideStep>

      <GuideStep number={5} title="Únelas por las cruces (solapando)">
        <p>
          Cada hoja repite una franja de <strong>1 cm</strong> de la hoja de al
          lado, con cruces encima. Superpón esa franja hasta que las cruces de
          las dos hojas queden una encima de la otra y pega.
        </p>
        <GuideFigure caption="La franja compartida: cuando las cruces coinciden, la imagen continúa sin saltos.">
          <SheetOverlapDiagram />
        </GuideFigure>
        <ol>
          <li>
            Pon la hoja de la derecha encima de la de la izquierda, solapando la
            franja.
          </li>
          <li>
            Mueve la de arriba hasta que las cruces coincidan. Al trasluz,
            contra una ventana, se ven las dos a la vez y es mucho más fácil.
          </li>
          <li>
            Pega con barra de pegamento en la franja o con cinta de papel por
            detrás.
          </li>
        </ol>
        <p>
          <strong>Primero cada fila</strong> (A1 con A2 con A3) y después{" "}
          <strong>las filas entre sí</strong>, de arriba abajo. Es mucho más
          fácil alinear tiras largas que hojas sueltas.
        </p>
      </GuideStep>

      <GuideStep number={6} title="Únelas borde con borde (sin solape)">
        <p>
          En cada esquina de la zona impresa hay dos marcas cortas en el margen
          blanco: prolongan los bordes de la imagen. Una regla apoyada en las
          dos marcas de un lado te da la línea de corte exacta.
        </p>
        <GuideFigure caption="Corta el margen por la línea que marcan las esquinas; las medias cruces del borde se completan al juntar las hojas.">
          <TrimJoinDiagram />
        </GuideFigure>
        <ol>
          <li>
            En cada hoja, recorta el margen del lado derecho y del de abajo, con
            regla metálica y cúter. Deja los márgenes de la izquierda y de
            arriba: sirven de pestaña.
          </li>
          <li>
            Pon cada hoja recortada encima del margen que dejaste en su vecina,
            con los bordes de la imagen tocándose. Las medias cruces de los dos
            bordes forman una cruz entera cuando están bien.
          </li>
          <li>
            Pega con barra de pegamento sobre la pestaña o con cinta por detrás.
          </li>
        </ol>
        <p>
          Igual que al solapar: primero cada fila, después las filas entre sí.
        </p>
        <GuideNote>
          <strong>Si algo no encaja por uno o dos milímetros,</strong> es
          normal: el papel se estira un poco y las impresoras no son perfectas.
          Reparte la diferencia entre las juntas. Si no encaja nada, vuelve al
          paso 1: casi siempre es la escala.
        </GuideNote>
      </GuideStep>

      <GuideStep title="Y ahora, la piñata">
        <p>
          Con el póster unido tienes la plantilla del frente. Cómo pasarla a
          cartón, darle volumen y cerrarla con los dulces dentro está en{" "}
          <Link
            href="/guias/como-hacer-una-pinata-de-carton"
            className="underline underline-offset-4"
          >
            cómo hacer una piñata de cartón con tu imagen
          </Link>
          .
        </p>
      </GuideStep>
    </GuideArticle>
  );
}
