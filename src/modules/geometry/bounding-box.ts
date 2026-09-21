import { createDimensions, type Dimensions } from "./dimensions";
import { InvalidGeometryError } from "./errors";
import type { Point } from "./point";
import { isFiniteMillimeters, type Millimeters } from "./units";

/**
 * Límites físicos de una geometría. Ver docs/geometry.md §11.
 */
export type BoundingBox = {
  readonly minX: Millimeters;
  readonly minY: Millimeters;
  readonly maxX: Millimeters;
  readonly maxY: Millimeters;
};

export function createBoundingBox(bounds: BoundingBox): BoundingBox {
  const { minX, minY, maxX, maxY } = bounds;

  for (const [name, value] of Object.entries(bounds)) {
    if (!isFiniteMillimeters(value)) {
      throw new InvalidGeometryError(
        `Bounding box ${name} must be a finite value in millimeters, received ${value}.`,
      );
    }
  }

  if (minX > maxX || minY > maxY) {
    throw new InvalidGeometryError(
      `Bounding box minimum must not exceed its maximum, received (${minX}, ${minY}) to (${maxX}, ${maxY}).`,
    );
  }

  return { minX, minY, maxX, maxY };
}

export function boundingBoxFromPoints(points: readonly Point[]): BoundingBox {
  if (points.length === 0) {
    throw new InvalidGeometryError(
      "A bounding box cannot be derived from an empty set of points.",
    );
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return createBoundingBox({ minX, minY, maxX, maxY });
}

/**
 * Tamaño físico de la región delimitada.
 *
 * Rechaza cajas degeneradas (sin área) porque las operaciones que piden
 * dimensiones —escalado, tiling, impresión— requieren una superficie real.
 * Ver docs/geometry.md §44.
 */
export function boundingBoxDimensions(bounds: BoundingBox): Dimensions {
  return createDimensions(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
}
