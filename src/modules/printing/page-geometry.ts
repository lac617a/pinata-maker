import type { BoundingBox } from "@/modules/geometry/bounding-box";
import { clipPolygonToRectangle } from "@/modules/geometry/clip";
import type { Vector } from "@/modules/geometry/point";
import { type Polygon, translatePolygon } from "@/modules/geometry/polygon";
import type {
  CutLine,
  FoldLine,
  TemplateGeometry,
} from "@/modules/geometry/template-geometry";

import type { PrintPageRegion } from "./tiling";

/**
 * Geometría que corresponde a una hoja concreta.
 *
 * Comparte la estructura de `TemplateGeometry`, pero con dos diferencias que
 * importan al renderizar:
 *
 * 1. Sus coordenadas son locales al origen del área imprimible de la página,
 *    no globales a la plantilla (docs/geometry.md §51 y §52).
 * 2. Sus contornos pueden estar abiertos, porque una figura que cruza el borde
 *    de la hoja aparece recortada (docs/printing.md §60).
 *
 * Ver docs/geometry.md §72.
 */
export type TemplatePageGeometry = TemplateGeometry;

/**
 * Obtiene la parte de la plantilla que se imprime en una página.
 *
 * La operación solo recorta y traslada. No escala: una plantilla de
 * 800 × 1000 mm repartida en hojas sigue midiendo 800 × 1000 mm al
 * reensamblarse. Ver docs/printing.md §54 y §100.
 */
export function clipGeometryToPage(
  geometry: TemplateGeometry,
  page: PrintPageRegion,
): TemplatePageGeometry {
  const region = page.globalBounds;
  const toLocalOrigin: Vector = { x: -region.minX, y: -region.minY };

  const clip = (polygon: Polygon): Polygon[] =>
    clipPolygonToRectangle(polygon, region).map((fragment) =>
      translatePolygon(fragment, toLocalOrigin),
    );

  return {
    outerContours: geometry.outerContours.flatMap(clip),
    holes: geometry.holes.flatMap(clip),
    cutLines: geometry.cutLines.flatMap((line): CutLine[] =>
      clip(line.geometry).map((fragment) => ({ geometry: fragment })),
    ),
    foldLines: geometry.foldLines.flatMap((line): FoldLine[] =>
      clip(line.geometry).map((fragment) => ({ geometry: fragment })),
    ),
  };
}

/**
 * Indica si algún trazo de la página atraviesa una región.
 *
 * Se utiliza para colocar elementos añadidos —como la regla de calibración—
 * en una zona libre de la hoja. Ver docs/printing.md §41.
 *
 * Una región completamente rodeada por la figura, sin ningún trazo que la
 * cruce, se considera libre: ahí no hay líneas que confundir.
 */
export function pageGeometryIntersectsRectangle(
  geometry: TemplatePageGeometry,
  rectangle: BoundingBox,
): boolean {
  const crosses = (polygon: Polygon): boolean =>
    clipPolygonToRectangle(polygon, rectangle).length > 0;

  return (
    geometry.outerContours.some(crosses) ||
    geometry.holes.some(crosses) ||
    geometry.cutLines.some((line) => crosses(line.geometry)) ||
    geometry.foldLines.some((line) => crosses(line.geometry))
  );
}
