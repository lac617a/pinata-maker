import type {
  EmbeddedImage,
  PrintableDocument,
  PrintDocument,
  PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import {
  type Poster,
  posterGeometry,
  posterLayout,
} from "@/modules/posters/poster";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";

import { describePaper } from "./generate-printable-document";

export type GeneratePosterDocumentInput = {
  readonly poster: Poster;
  readonly image: EmbeddedImage;
  readonly title: string;
  /** La implementación concreta la decide quien llama, no este caso de uso. */
  readonly renderer: PrintRenderer;
  readonly print?: PrintConfiguration;
  readonly fileName?: string;
  readonly creationDate?: Date;
};

/**
 * La imagen ampliada a tamaño real y repartida en hojas.
 *
 * Una hoja de resumen con el mapa de montaje y la regla de calibración, y
 * después cada trozo de la imagen en su hoja, con su etiqueta y sus marcas de
 * alineación. Es la salida que pide el producto (docs/PRD.md §44).
 *
 * No calcula nada propio: el tamaño y el reparto salen del módulo de pósters,
 * los mismos que usa la vista previa.
 */
export async function generatePosterDocument(
  input: GeneratePosterDocumentInput,
): Promise<PrintableDocument> {
  const print = input.print ?? DEFAULT_PRINT_CONFIGURATION;
  const layout = posterLayout(input.poster, print);

  const document: PrintDocument = {
    cover: {
      kind: "POSTER",
      title: input.title,
      width: input.poster.width,
      height: input.poster.height,
      paper: describePaper(print.paper.format, print.paper.orientation),
      image: input.image,
    },
    sections: [
      {
        // Sin etiqueta de sección: hay una sola, y el pie de cada hoja queda
        // en «A1», que es lo que el mapa enseña.
        label: "",
        layout,
        kind: "POSTER",
        artwork: {
          image: input.image,
          placement: {
            x: 0,
            y: 0,
            width: input.poster.width,
            height: input.poster.height,
          },
          mirrored: false,
          clip: posterGeometry(input.poster).outerContours,
        },
      },
    ],
  };

  return input.renderer.render(document, {
    fileName: input.fileName ?? `${input.title}.pdf`,
    creationDate: input.creationDate,
  });
}
