import { InvalidGeometryError } from "./errors";
import { isFiniteMillimeters, type Millimeters } from "./units";

/**
 * Posición física en el sistema de coordenadas del dominio.
 *
 * Origen arriba-izquierda, X crece hacia la derecha e Y hacia abajo.
 * Ver docs/geometry.md §6 y §7.
 */
export type Point = {
  readonly x: Millimeters;
  readonly y: Millimeters;
};

export function createPoint(x: Millimeters, y: Millimeters): Point {
  if (!isFiniteMillimeters(x) || !isFiniteMillimeters(y)) {
    throw new InvalidGeometryError(
      `Point coordinates must be finite values in millimeters, received (${x}, ${y}).`,
    );
  }

  return { x, y };
}
