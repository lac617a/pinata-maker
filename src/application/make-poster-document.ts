import {
  orientedSize,
  readImageHeader,
} from "@/modules/image-processing/image-header";
import type {
  EmbeddedImageFormat,
  PrintableDocument,
  PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import {
  createImageCrop,
  fullImageCrop,
  type ImageCrop,
} from "@/modules/posters/crop";
import {
  createPoster,
  type Poster,
  type PosterSizeRequest,
} from "@/modules/posters/poster";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";

import { generatePosterDocument } from "./generate-poster-document";

/** Lo que el usuario pide del póster: tamaño, recorte y papel. */
export type PosterRequest = {
  /** Un lado en mm; el otro sale de la proporción del recorte. */
  readonly size: PosterSizeRequest;
  /** La parte de la imagen que se imprime, en pixels. Sin él, entera. */
  readonly crop?: ImageCrop;
  readonly print?: PrintConfiguration;
};

/**
 * De los bytes de una imagen al PDF del póster.
 *
 * Lo comparten el proyecto guardado y el uso sin cuenta: lo único que los
 * distingue es de dónde salen los bytes y qué se hace con el documento.
 *
 * Todo se decide con el archivo, no con lo que diga el navegador: el tamaño
 * y la orientación salen de su cabecera, y el recorte se valida contra ella.
 * Todo se mide sobre la imagen girada, la que ve el usuario (docs/pdf.md §97).
 */
export async function makePosterDocument(input: {
  readonly bytes: Uint8Array;
  readonly request: PosterRequest;
  readonly title: string;
  readonly renderer: PrintRenderer;
  readonly now: Date;
}): Promise<{
  readonly document: PrintableDocument;
  readonly poster: Poster;
  readonly print: PrintConfiguration;
}> {
  const header = readImageHeader(input.bytes);
  const size = orientedSize(header);
  const crop = input.request.crop
    ? createImageCrop(size, input.request.crop)
    : fullImageCrop(size);
  const poster = createPoster(crop, input.request.size);
  const print = input.request.print ?? DEFAULT_PRINT_CONFIGURATION;

  const document = await generatePosterDocument({
    poster,
    image: {
      bytes: input.bytes,
      format: EMBEDDED_FORMATS[header.format],
      orientation: header.orientation,
    },
    imageSize: size,
    crop,
    title: input.title,
    renderer: input.renderer,
    print,
    fileName: `${input.title}-${Math.round(poster.width / 10)}cm.pdf`,
    creationDate: input.now,
  });

  return { document, poster, print };
}

const EMBEDDED_FORMATS: Record<string, EmbeddedImageFormat> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WEBP",
};
