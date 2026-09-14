/**
 * Errores del motor geométrico.
 *
 * Representan violaciones de invariantes físicas, no fallos de infraestructura.
 * Ver docs/domain.md §63 y docs/architecture.md §43.
 */

export class InvalidGeometryError extends Error {
  readonly code = "INVALID_GEOMETRY";

  constructor(message: string) {
    super(message);
    this.name = "InvalidGeometryError";
  }
}

export class InvalidDimensionsError extends Error {
  readonly code = "INVALID_DIMENSIONS";

  constructor(message: string) {
    super(message);
    this.name = "InvalidDimensionsError";
  }
}

export class InvalidScaleError extends Error {
  readonly code = "INVALID_SCALE";

  constructor(message: string) {
    super(message);
    this.name = "InvalidScaleError";
  }
}
