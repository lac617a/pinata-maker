import { boundingBoxFromPoints, type BoundingBox } from "./bounding-box";
import { InvalidGeometryError } from "./errors";
import { isFiniteMillimeters } from "./units";
import {
  distanceBetween,
  translatePoint,
  type Point,
  type Vector,
} from "./point";
import type { Millimeters } from "./units";

/**
 * Secuencia ordenada de puntos físicos.
 *
 * `closed` distingue un contorno cerrado de una polilínea abierta. El cierre es
 * explícito: no se deduce de que el primer y el último punto coincidan, porque
 * una pieza física no puede depender de esa coincidencia accidental.
 * Ver docs/geometry.md §15 y §16.
 */
export type Polygon = {
  readonly points: readonly Point[];
  readonly closed: boolean;
};

const MINIMUM_POINTS_OPEN = 2;
const MINIMUM_POINTS_CLOSED = 3;

export function createPolygon(
  points: readonly Point[],
  closed: boolean,
): Polygon {
  const minimum = closed ? MINIMUM_POINTS_CLOSED : MINIMUM_POINTS_OPEN;

  if (points.length < minimum) {
    throw new InvalidGeometryError(
      `A ${closed ? "closed" : "open"} polygon requires at least ${minimum} points, received ${points.length}.`,
    );
  }

  for (const point of points) {
    if (!isFiniteMillimeters(point.x) || !isFiniteMillimeters(point.y)) {
      throw new InvalidGeometryError(
        `Polygon points must be finite values in millimeters, received (${point.x}, ${point.y}).`,
      );
    }
  }

  return { points, closed };
}

export function polygonBounds(polygon: Polygon): BoundingBox {
  return boundingBoxFromPoints(polygon.points);
}

/**
 * Segmentos que componen la geometría.
 *
 * Un polígono cerrado incluye el segmento de cierre entre el último punto y el
 * primero; una polilínea abierta no lo incluye.
 */
export function polygonSegments(
  polygon: Polygon,
): readonly (readonly [Point, Point])[] {
  const segments: (readonly [Point, Point])[] = [];

  for (let index = 0; index < polygon.points.length - 1; index++) {
    segments.push([polygon.points[index], polygon.points[index + 1]]);
  }

  if (polygon.closed) {
    segments.push([
      polygon.points[polygon.points.length - 1],
      polygon.points[0],
    ]);
  }

  return segments;
}

/**
 * Longitud del recorrido del polígono.
 *
 * Un contorno cerrado incluye el segmento de cierre, así que su perímetro es
 * la vuelta completa. Es la medida de la que sale la tira lateral de una
 * plantilla. Ver docs/template.md §113.
 */
export function polygonPerimeter(polygon: Polygon): Millimeters {
  return polygonSegments(polygon).reduce(
    (total, [from, to]) => total + distanceBetween(from, to),
    0,
  );
}

/**
 * Trasladar no cambia el tamaño físico de la geometría, solo su posición.
 * Ver docs/geometry.md §21 y §94.
 */
export function translatePolygon(polygon: Polygon, vector: Vector): Polygon {
  return {
    points: polygon.points.map((point) => translatePoint(point, vector)),
    closed: polygon.closed,
  };
}
