import type { Millimeters } from "@/modules/geometry/units";

import type { ImageCrop } from "./crop";
import type { Poster } from "./poster";

const MILLIMETERS_PER_INCH = 25.4;

/**
 * Cuánto detalle le queda a la imagen una vez ampliada.
 *
 * Al ampliar no se inventa detalle: 720 pixels repartidos en 60 cm son unos
 * 30 por pulgada, y cada pixel mide casi un milímetro en el papel. Se avisa
 * antes de imprimir, no se impide: el tamaño lo decide la piñata, y a veces
 * compensa una figura algo borrosa (docs/pdf.md §96).
 */
export type PosterSharpness = "SHARP" | "SOFT" | "PIXELATED";

/**
 * Pixels por pulgada a partir de los cuales se ve bien a cada distancia.
 *
 * El ojo distingue alrededor de un minuto de arco: a 1 m son unos 0,29 mm,
 * unos 90 pixels por pulgada; a 2 m, la mitad. Una piñata se mira de uno a
 * dos metros. Por encima de `sharp` se ve nítida de cerca; entre los dos,
 * nítida a un par de metros y suave de cerca; por debajo, los pixels se ven
 * también de lejos.
 */
export const SHARPNESS_THRESHOLDS = {
  sharp: 90,
  soft: 45,
} as const;

/** Pixels de la imagen por pulgada de papel. Igual en los dos ejes. */
export function posterPixelsPerInch(poster: Poster, crop: ImageCrop): number {
  return crop.width / (poster.width / MILLIMETERS_PER_INCH);
}

export function posterSharpness(pixelsPerInch: number): PosterSharpness {
  if (pixelsPerInch >= SHARPNESS_THRESHOLDS.sharp) {
    return "SHARP";
  }

  if (pixelsPerInch >= SHARPNESS_THRESHOLDS.soft) {
    return "SOFT";
  }

  return "PIXELATED";
}

/**
 * El lado más grande que conserva `pixelsPerInch`, para proponerlo en lugar
 * de solo avisar. Redondeado hacia abajo al milímetro.
 */
export function largestSideForResolution(
  crop: ImageCrop,
  pixelsPerInch: number,
  axis: "width" | "height",
): Millimeters {
  return Math.floor((crop[axis] / pixelsPerInch) * MILLIMETERS_PER_INCH);
}
