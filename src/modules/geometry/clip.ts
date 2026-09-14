import type { BoundingBox } from "./bounding-box";
import { pointsEqual, type Point } from "./point";
import { createPolygon, polygonSegments, type Polygon } from "./polygon";
import { GEOMETRY_TOLERANCE_MM } from "./units";

/**
 * Recorta una geometría contra una región rectangular.
 *
 * El recorte únicamente decide qué parte de la geometría pertenece a la
 * región: nunca escala, deforma ni rota. Ver docs/geometry.md §48.
 *
 * El resultado son polilíneas abiertas, no polígonos rellenos. Un contorno que
 * atraviesa el borde de una página no debe cerrarse siguiendo ese borde: la
 * línea del papel no es una línea de corte física.
 * Ver docs/printing.md §59 y §60.
 */
export function clipPolygonToRectangle(
  polygon: Polygon,
  rectangle: BoundingBox,
): Polygon[] {
  const fullyContained = polygon.points.every((point) =>
    rectangleContainsPoint(rectangle, point),
  );

  if (fullyContained) {
    return [polygon];
  }

  const runs: Point[][] = [];
  let current: Point[] | null = null;

  for (const [start, end] of polygonSegments(polygon)) {
    const clipped = clipSegment(start, end, rectangle);

    if (!clipped) {
      // El segmento queda fuera por completo: la continuidad se interrumpe.
      current = null;
      continue;
    }

    const [from, to] = clipped;

    if (current && pointsEqual(current[current.length - 1], from)) {
      current.push(to);
      continue;
    }

    current = [from, to];
    runs.push(current);
  }

  // Un contorno cerrado puede haber quedado partido justo en su punto inicial.
  // Si el último tramo termina donde empieza el primero, son el mismo trazo.
  if (polygon.closed && runs.length > 1) {
    const first = runs[0];
    const last = runs[runs.length - 1];

    if (pointsEqual(last[last.length - 1], first[0])) {
      runs[0] = [...last.slice(0, -1), ...first];
      runs.pop();
    }
  }

  return runs
    .map(removeConsecutiveDuplicates)
    .filter((points) => points.length >= 2)
    .map((points) => createPolygon(points, false));
}

export function rectangleContainsPoint(
  rectangle: BoundingBox,
  point: Point,
): boolean {
  return (
    point.x >= rectangle.minX - GEOMETRY_TOLERANCE_MM &&
    point.x <= rectangle.maxX + GEOMETRY_TOLERANCE_MM &&
    point.y >= rectangle.minY - GEOMETRY_TOLERANCE_MM &&
    point.y <= rectangle.maxY + GEOMETRY_TOLERANCE_MM
  );
}

/**
 * Recorte de un segmento contra un rectángulo alineado a los ejes
 * (algoritmo de Liang-Barsky).
 *
 * Devuelve `null` cuando el segmento queda completamente fuera. Los extremos
 * resultantes se calculan sobre el segmento original, de modo que el trazo
 * conserva su dirección y su escala.
 */
function clipSegment(
  start: Point,
  end: Point,
  rectangle: BoundingBox,
): readonly [Point, Point] | null {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  const directions = [-deltaX, deltaX, -deltaY, deltaY];
  const distances = [
    start.x - rectangle.minX,
    rectangle.maxX - start.x,
    start.y - rectangle.minY,
    rectangle.maxY - start.y,
  ];

  let entry = 0;
  let exit = 1;

  for (let edge = 0; edge < 4; edge++) {
    const direction = directions[edge];
    const distance = distances[edge];

    if (direction === 0) {
      // Segmento paralelo a este borde: solo importa de qué lado está.
      if (distance < 0) {
        return null;
      }
      continue;
    }

    const crossing = distance / direction;

    if (direction < 0) {
      if (crossing > exit) return null;
      if (crossing > entry) entry = crossing;
    } else {
      if (crossing < entry) return null;
      if (crossing < exit) exit = crossing;
    }
  }

  return [
    { x: start.x + entry * deltaX, y: start.y + entry * deltaY },
    { x: start.x + exit * deltaX, y: start.y + exit * deltaY },
  ];
}

function removeConsecutiveDuplicates(points: readonly Point[]): Point[] {
  return points.filter(
    (point, index) => index === 0 || !pointsEqual(points[index - 1], point),
  );
}
