import { InvalidContourError } from "./errors";
import type { PixelPoint, Pixels } from "./pixel-contour";

/**
 * Reduce los puntos de un contorno conservando su forma (Douglas-Peucker).
 *
 * Un contorno extraído de una máscara puede tener miles de puntos, uno por
 * cada pixel del borde. Conservarlos todos no aporta precisión física y
 * encarece el recorte y el PDF. Ver docs/image-processing.md §41 y §43.
 *
 * La tolerancia se expresa en pixels, pero quien llama debe derivarla de una
 * tolerancia física para que el resultado no dependa de la resolución de la
 * imagen. Ver docs/image-processing.md §44 y §45.
 *
 * El algoritmo conserva el primer y el último punto de la secuencia. En un
 * contorno cerrado eso significa que la zona del punto inicial se simplifica
 * algo menos; la forma se preserva igual y el resultado sigue siendo
 * determinista.
 */
export function simplifyPixelContour(
  points: readonly PixelPoint[],
  tolerance: Pixels,
): PixelPoint[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new InvalidContourError(
      `Simplification tolerance must be a finite value of at least 0 px, received ${tolerance}.`,
    );
  }

  if (tolerance === 0 || points.length <= 2) {
    return [...points];
  }

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  // Se recorre con una pila explícita en lugar de recursión: un contorno
  // ruidoso puede generar una profundidad proporcional al número de puntos.
  const pending: [number, number][] = [[0, points.length - 1]];

  while (pending.length > 0) {
    const [first, last] = pending.pop()!;

    let furthest = -1;
    let maxDeviation = tolerance;

    for (let index = first + 1; index < last; index++) {
      const deviation = distanceToSegment(
        points[index],
        points[first],
        points[last],
      );

      if (deviation > maxDeviation) {
        maxDeviation = deviation;
        furthest = index;
      }
    }

    if (furthest === -1) {
      continue;
    }

    keep[furthest] = true;
    pending.push([first, furthest], [furthest, last]);
  }

  return points.filter((_, index) => keep[index]);
}

function distanceToSegment(
  point: PixelPoint,
  start: PixelPoint,
  end: PixelPoint,
): Pixels {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const squaredLength = segmentX * segmentX + segmentY * segmentY;

  if (squaredLength === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection =
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
    squaredLength;

  const clamped = Math.max(0, Math.min(1, projection));

  return Math.hypot(
    point.x - (start.x + clamped * segmentX),
    point.y - (start.y + clamped * segmentY),
  );
}
