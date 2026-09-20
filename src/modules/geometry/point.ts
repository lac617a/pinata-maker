import { InvalidGeometryError } from "./errors";
import {
  isFiniteMillimeters,
  millimetersEqual,
  type Millimeters,
} from "./units";

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

/**
 * Desplazamiento físico.
 *
 * Comparte la forma de `Point` pero no su significado: un `Point` es una
 * posición y un `Vector` es un movimiento. Ver docs/geometry.md §9.
 */
export type Vector = {
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

/** Ver docs/geometry.md §21. */
export function translatePoint(point: Point, vector: Vector): Point {
  return { x: point.x + vector.x, y: point.y + vector.y };
}

/** Distancia física entre dos posiciones. Ver docs/geometry.md §21. */
export function distanceBetween(a: Point, b: Point): Millimeters {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Comparación de posiciones con la tolerancia geométrica del dominio. */
export function pointsEqual(a: Point, b: Point): boolean {
  return millimetersEqual(a.x, b.x) && millimetersEqual(a.y, b.y);
}
