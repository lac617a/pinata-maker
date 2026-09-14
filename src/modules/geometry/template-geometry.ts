import { boundingBoxFromPoints, type BoundingBox } from "./bounding-box";
import { InvalidGeometryError } from "./errors";
import type { Point } from "./point";
import type { Polygon } from "./polygon";

/**
 * Línea que debe recortarse físicamente.
 *
 * Su significado vive en el modelo, no en el estilo con el que se dibuje: el
 * renderer decide cómo representarla. Ver docs/architecture.md §19.
 */
export type CutLine = {
  readonly geometry: Polygon;
};

/** Línea donde el material debe doblarse. Ver docs/architecture.md §20. */
export type FoldLine = {
  readonly geometry: Polygon;
};

/**
 * Forma física de una plantilla.
 *
 * Cada tipo de línea se representa por separado porque su semántica es
 * distinta: un contorno delimita la pieza, un hueco la perfora, una línea de
 * corte se recorta y una de doblez se pliega. Ver docs/geometry.md §18 y §19.
 *
 * Las pestañas y las marcas de alineación se incorporarán cuando exista la
 * regla geométrica que las genera (docs/printing.md §34).
 */
export type TemplateGeometry = {
  readonly outerContours: readonly Polygon[];
  readonly holes: readonly Polygon[];
  readonly cutLines: readonly CutLine[];
  readonly foldLines: readonly FoldLine[];
};

export function createTemplateGeometry(
  geometry: Partial<TemplateGeometry>,
): TemplateGeometry {
  const outerContours = geometry.outerContours ?? [];
  const holes = geometry.holes ?? [];

  assertClosed(outerContours, "outer contour");
  assertClosed(holes, "hole");

  return {
    outerContours,
    holes,
    cutLines: geometry.cutLines ?? [],
    foldLines: geometry.foldLines ?? [],
  };
}

/**
 * Límites físicos de la plantilla completa.
 *
 * Se derivan de todos los trazos, no solo del contorno exterior: una línea de
 * corte o una pestaña situada fuera del contorno también debe imprimirse.
 */
export function templateGeometryBounds(
  geometry: TemplateGeometry,
): BoundingBox {
  const points: Point[] = [
    ...geometry.outerContours.flatMap((contour) => [...contour.points]),
    ...geometry.holes.flatMap((hole) => [...hole.points]),
    ...geometry.cutLines.flatMap((line) => [...line.geometry.points]),
    ...geometry.foldLines.flatMap((line) => [...line.geometry.points]),
  ];

  if (points.length === 0) {
    throw new InvalidGeometryError(
      "An empty template geometry has no physical bounds.",
    );
  }

  return boundingBoxFromPoints(points);
}

export function isTemplateGeometryEmpty(geometry: TemplateGeometry): boolean {
  return (
    geometry.outerContours.length === 0 &&
    geometry.holes.length === 0 &&
    geometry.cutLines.length === 0 &&
    geometry.foldLines.length === 0
  );
}

/**
 * Un contorno o un hueco delimitan una superficie física, por lo que deben
 * estar cerrados. Ver docs/geometry.md §15 y docs/domain.md §26.
 */
function assertClosed(polygons: readonly Polygon[], description: string): void {
  for (const polygon of polygons) {
    if (!polygon.closed) {
      throw new InvalidGeometryError(
        `A template ${description} must be a closed polygon.`,
      );
    }
  }
}
