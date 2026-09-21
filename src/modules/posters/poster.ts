import { createPolygon } from "@/modules/geometry/polygon";
import {
  createTemplateGeometry,
  type TemplateGeometry,
} from "@/modules/geometry/template-geometry";
import type { Millimeters } from "@/modules/geometry/units";
import type { Pixels } from "@/modules/image-processing/pixel-contour";
import { calculatePrintableArea } from "@/modules/printing/margins";
import { paperSize } from "@/modules/printing/paper-format";
import {
  createPrintLayout,
  type PrintConfiguration,
  type PrintLayout,
} from "@/modules/printing/print-layout";

import { InvalidPosterSizeError } from "./errors";

/**
 * La imagen del usuario ampliada a tamaño real, para repartirla en hojas.
 *
 * Es la salida del producto desde el 2026-09-21 (docs/PRD.md §44): el
 * fabricante imprime la figura entera, la pega sobre cartón y recorta él
 * mismo el contorno. No hay piezas ni pestañas; hay una imagen grande y un
 * mapa para montarla.
 */
export type Poster = {
  readonly width: Millimeters;
  readonly height: Millimeters;
};

/**
 * Qué medida fija el usuario. La otra sale de la proporción de la imagen:
 * deformar la figura para cumplir dos medidas a la vez no es una opción
 * (docs/image-processing.md §55).
 */
export type PosterSizeRequest =
  { readonly width: Millimeters } | { readonly height: Millimeters };

/**
 * Lo que tiene sentido imprimir en hojas.
 *
 * Por debajo de 10 cm no hace falta repartir nada. Por encima de 3 m el
 * documento pasa de cien hojas y deja de ser una piñata para ser una pared.
 * El techo de hojas del documento (`MAX_DOCUMENT_PAGES`) sigue aplicando.
 */
export const POSTER_LIMITS = {
  minSide: 100,
  maxSide: 3000,
} as const;

export function createPoster(
  image: { readonly width: Pixels; readonly height: Pixels },
  request: PosterSizeRequest,
): Poster {
  if (
    !(image.width > 0 && image.height > 0) ||
    !Number.isFinite(image.width) ||
    !Number.isFinite(image.height)
  ) {
    throw new InvalidPosterSizeError(
      `An image of ${image.width} × ${image.height} px has no proportion.`,
    );
  }

  const aspect = image.height / image.width;

  const poster =
    "width" in request
      ? { width: request.width, height: request.width * aspect }
      : { width: request.height / aspect, height: request.height };

  for (const side of [poster.width, poster.height]) {
    if (
      !Number.isFinite(side) ||
      side < POSTER_LIMITS.minSide ||
      side > POSTER_LIMITS.maxSide
    ) {
      throw new InvalidPosterSizeError(
        `A poster side must be between ${POSTER_LIMITS.minSide} and ${POSTER_LIMITS.maxSide} mm, this one would be ${poster.width.toFixed(0)} × ${poster.height.toFixed(0)} mm.`,
      );
    }
  }

  return poster;
}

/**
 * El póster como geometría: un rectángulo que empieza en (0,0).
 *
 * Es lo que necesita el reparto en hojas para saber qué cubrir. No se dibuja
 * —el borde lo marca la propia imagen—, pero sus hojas, marcas y etiquetas
 * salen de aquí igual que las de cualquier plantilla.
 */
export function posterGeometry(poster: Poster): TemplateGeometry {
  return createTemplateGeometry({
    outerContours: [
      createPolygon(
        [
          { x: 0, y: 0 },
          { x: poster.width, y: 0 },
          { x: poster.width, y: poster.height },
          { x: 0, y: poster.height },
        ],
        true,
      ),
    ],
  });
}

/**
 * El reparto del póster en hojas.
 *
 * El mismo `createPrintLayout` de siempre: márgenes, solape entre hojas,
 * etiquetas A1/B2, marcas de alineación y regla de calibración. La vista
 * previa y el PDF lo llaman igual, así que las hojas que se ven son las que
 * se imprimen.
 */
export function posterLayout(
  poster: Poster,
  print: PrintConfiguration,
): PrintLayout {
  return createPrintLayout(posterGeometry(poster), print);
}

/**
 * El lado que llena justo `sheets` hojas, contando el solape entre ellas.
 *
 * Con N hojas se cubren N áreas imprimibles menos los N − 1 solapes. Pedir un
 * milímetro más añade una fila o columna entera casi vacía: por eso la
 * interfaz ofrece estas medidas en lugar de dejar que el usuario las adivine.
 * Se redondea hacia abajo al milímetro para no rozar el borde por coma
 * flotante.
 */
export function posterSideForSheets(
  sheets: number,
  axis: "width" | "height",
  print: PrintConfiguration,
): Millimeters {
  const printable = calculatePrintableArea(
    paperSize(print.paper.format, print.paper.orientation),
    print.paper.margins,
  )[axis];

  return Math.floor(sheets * printable - (sheets - 1) * print.overlap);
}

/**
 * Cuánto se aprovecha la última columna o fila, de 0 a 1.
 *
 * Una última columna al 8 % es una hoja entera impresa para dos centímetros
 * de imagen. La interfaz lo usa para proponer la medida que cabe justa.
 */
export function lastSheetUsage(
  poster: Poster,
  layout: PrintLayout,
  axis: "width" | "height",
): number {
  const count = axis === "width" ? layout.columns : layout.rows;
  const last = layout.pages.find((page) =>
    axis === "width" ? page.column === count - 1 : page.row === count - 1,
  );

  if (!last || count === 1) {
    return 1;
  }

  const start =
    axis === "width" ? last.globalBounds.minX : last.globalBounds.minY;
  const end =
    axis === "width" ? last.globalBounds.maxX : last.globalBounds.maxY;

  return Math.min(1, Math.max(0, (poster[axis] - start) / (end - start)));
}
