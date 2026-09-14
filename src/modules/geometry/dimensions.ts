import { InvalidDimensionsError } from "./errors";
import { isFiniteMillimeters, type Millimeters } from "./units";

/**
 * Tamaño físico. Ver docs/geometry.md §10.
 */
export type Dimensions = {
  readonly width: Millimeters;
  readonly height: Millimeters;
};

/**
 * Una dimensión física representa una extensión medible, por lo que debe ser
 * finita y estrictamente positiva. Un ancho de 0 mm no es una figura
 * imprimible. Ver docs/domain.md §14 y docs/geometry.md §44.
 */
export function createDimensions(
  width: Millimeters,
  height: Millimeters,
): Dimensions {
  assertPositiveMillimeters(width, "width");
  assertPositiveMillimeters(height, "height");

  return { width, height };
}

export function assertPositiveMillimeters(
  value: Millimeters,
  name: string,
): asserts value is Millimeters {
  if (!isFiniteMillimeters(value)) {
    throw new InvalidDimensionsError(
      `${name} must be a finite value in millimeters, received ${value}.`,
    );
  }

  if (value <= 0) {
    throw new InvalidDimensionsError(
      `${name} must be greater than 0 mm, received ${value} mm.`,
    );
  }
}
