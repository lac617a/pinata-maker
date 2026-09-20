import { EmptyMaskError, InvalidImageDimensionsError } from "./errors";
import type { Pixels } from "./pixel-contour";

/**
 * Canal alfa de una imagen ya segmentada.
 *
 * Es lo que produce la eliminación de fondo, venga de donde venga: un valor
 * por pixel entre 0 y 255. No es todavía geometría, porque sus bordes
 * contienen antialiasing y ruido. Ver docs/image-processing.md §29 y §30.
 */
export type AlphaMask = {
  readonly width: Pixels;
  readonly height: Pixels;
  /** Un valor por pixel, en orden de filas desde arriba. */
  readonly alpha: Uint8Array;
};

/**
 * Máscara de la que sí puede extraerse un contorno.
 *
 * Cada pixel pertenece a la figura o al fondo, sin grados intermedios: un
 * borde medio transparente no puede recortarse por la mitad.
 * Ver docs/image-processing.md §21 y §22.
 */
export type BinaryMask = {
  readonly width: Pixels;
  readonly height: Pixels;
  /** `1` figura, `0` fondo. */
  readonly foreground: Uint8Array;
};

/**
 * Umbral por defecto: la mitad del canal.
 *
 * Un pixel más opaco que transparente pertenece a la figura. El valor es
 * configurable porque la frontera correcta depende de cómo se generó la
 * máscara. Ver docs/image-processing.md §31 y §32.
 */
export const DEFAULT_ALPHA_THRESHOLD = 128;

export function createAlphaMask(
  width: Pixels,
  height: Pixels,
  alpha: Uint8Array,
): AlphaMask {
  assertMaskSize(width, height, alpha.length);

  return { width, height, alpha };
}

export function createBinaryMask(
  width: Pixels,
  height: Pixels,
  foreground: Uint8Array,
): BinaryMask {
  assertMaskSize(width, height, foreground.length);

  return { width, height, foreground };
}

/**
 * Decide qué pixels pertenecen a la figura.
 *
 * Es el único punto donde se toma esa decisión: tratar cualquier alfa
 * distinto de cero como figura haría que el antialiasing del borde agrandase
 * la pieza. Ver docs/image-processing.md §30, §31 y §32.
 */
export function thresholdAlphaMask(
  mask: AlphaMask,
  threshold: number = DEFAULT_ALPHA_THRESHOLD,
): BinaryMask {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 255) {
    throw new InvalidImageDimensionsError(
      `The alpha threshold must sit between 1 and 255, received ${threshold}.`,
    );
  }

  const foreground = new Uint8Array(mask.alpha.length);

  for (let index = 0; index < mask.alpha.length; index++) {
    foreground[index] = mask.alpha[index] >= threshold ? 1 : 0;
  }

  const binary = createBinaryMask(mask.width, mask.height, foreground);

  if (foregroundPixelCount(binary) === 0) {
    throw new EmptyMaskError(
      `No pixel reaches the alpha threshold of ${threshold}: the image has no detectable figure.`,
    );
  }

  return binary;
}

export function foregroundPixelCount(mask: BinaryMask): number {
  let count = 0;

  for (const value of mask.foreground) {
    count += value;
  }

  return count;
}

/** Índice del pixel dentro del buffer. Fuera de la imagen no hay figura. */
export function maskIndex(
  mask: Pick<BinaryMask, "width" | "height">,
  x: Pixels,
  y: Pixels,
): number {
  return y * mask.width + x;
}

export function isForeground(mask: BinaryMask, x: Pixels, y: Pixels): boolean {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) {
    return false;
  }

  return mask.foreground[maskIndex(mask, x, y)] === 1;
}

function assertMaskSize(
  width: Pixels,
  height: Pixels,
  length: number,
): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new InvalidImageDimensionsError(
      `A mask must measure whole positive pixel counts, received ${width} × ${height}.`,
    );
  }

  if (length !== width * height) {
    throw new InvalidImageDimensionsError(
      `A mask of ${width} × ${height} needs ${width * height} values, received ${length}.`,
    );
  }
}
