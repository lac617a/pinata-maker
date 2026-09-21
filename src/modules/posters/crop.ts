import type { Pixels } from "@/modules/image-processing/pixel-contour";

import { InvalidImageCropError } from "./errors";
import type { Poster } from "./poster";

/**
 * La parte de la imagen que se imprime, en pixels de la imagen original.
 *
 * El póster es este rectángulo ampliado: su proporción manda sobre la de la
 * imagen entera. Recortar no toca el archivo guardado; el PDF lleva la imagen
 * completa y la recorta al dibujarla (docs/pdf.md §95).
 *
 * En pixels y no en fracciones porque es lo que el servidor puede comprobar
 * contra la cabecera del archivo (docs/image-processing.md §110).
 */
export type ImageCrop = {
  readonly x: Pixels;
  readonly y: Pixels;
  readonly width: Pixels;
  readonly height: Pixels;
};

type ImageSize = { readonly width: Pixels; readonly height: Pixels };

/**
 * Lado mínimo de un recorte.
 *
 * Por debajo, el recorte es casi siempre un clic sin querer, y ampliar
 * treinta pixels a medio metro no da nada que se reconozca.
 */
export const CROP_MIN_SIDE: Pixels = 32;

/** Sin recorte: la imagen entera. */
export function fullImageCrop(image: ImageSize): ImageCrop {
  return { x: 0, y: 0, width: image.width, height: image.height };
}

/**
 * Valida que el recorte cae dentro de la imagen.
 *
 * El servidor lo comprueba contra el tamaño leído del archivo: un recorte
 * que se sale pediría imprimir hojas en blanco sin que nadie lo haya visto.
 */
export function createImageCrop(image: ImageSize, crop: ImageCrop): ImageCrop {
  const values = [crop.x, crop.y, crop.width, crop.height];

  if (!values.every(Number.isFinite)) {
    throw new InvalidImageCropError("A crop needs four finite numbers.");
  }

  if (crop.width < CROP_MIN_SIDE || crop.height < CROP_MIN_SIDE) {
    throw new InvalidImageCropError(
      `A crop side must be at least ${CROP_MIN_SIDE} px, this one is ${crop.width} × ${crop.height} px.`,
    );
  }

  if (
    crop.x < 0 ||
    crop.y < 0 ||
    crop.x + crop.width > image.width ||
    crop.y + crop.height > image.height
  ) {
    throw new InvalidImageCropError(
      `The crop ${crop.width} × ${crop.height} at (${crop.x}, ${crop.y}) falls outside an image of ${image.width} × ${image.height} px.`,
    );
  }

  return { ...crop };
}

/**
 * Dónde va la imagen entera, en mm del póster, para que el recorte llene
 * exactamente el rectángulo del póster.
 *
 * Lo que queda fuera cae en coordenadas negativas o más allá del póster, y
 * lo tapa el recorte al dibujar. La escala es la misma en los dos ejes: el
 * póster tiene la proporción del recorte (`createPoster`).
 */
export function posterImagePlacement(
  poster: Poster,
  image: ImageSize,
  crop: ImageCrop,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const scale = poster.width / crop.width;

  return {
    x: -crop.x * scale,
    y: -crop.y * scale,
    width: image.width * scale,
    height: image.height * scale,
  };
}
