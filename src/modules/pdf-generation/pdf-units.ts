import {
  isFiniteMillimeters,
  type Millimeters,
} from "@/modules/geometry/units";

import { InvalidPdfGeometryError } from "./errors";

/**
 * Unidad interna del formato PDF.
 *
 * Un valor tipado como `Points` ya ha cruzado el boundary de salida: no es una
 * magnitud del dominio y no debe volver a entrar en él. Ver docs/pdf.md §6 y
 * §8.
 */
export type Points = number;

/** Definición histórica del punto PDF. Ver docs/pdf.md §7. */
export const POINTS_PER_INCH = 72;

export const MILLIMETERS_PER_INCH = 25.4;

/**
 * Tolerancia al comparar dimensiones ya convertidas a puntos.
 *
 * 0,01 pt son unas 3,5 micras: por debajo de eso la diferencia no existe en
 * papel, pero sí distingue un error de conversión real del ruido de coma
 * flotante. Ver docs/pdf.md §46.
 */
export const POINT_TOLERANCE: Points = 0.01;

/**
 * Única conversión del sistema entre la unidad del dominio y la del PDF.
 *
 * No redondea: el redondeo pertenece al serializador de la librería, y
 * aplicarlo aquí acumularía error en cada coordenada de la plantilla.
 * Ver docs/pdf.md §9.
 */
export function millimetersToPoints(value: Millimeters): Points {
  if (!isFiniteMillimeters(value)) {
    throw new InvalidPdfGeometryError(
      `Cannot convert a non-finite value to PDF points, received ${value}.`,
    );
  }

  return (value * POINTS_PER_INCH) / MILLIMETERS_PER_INCH;
}

/** Comparación de magnitudes en puntos, para validar el documento generado. */
export function pointsEqual(
  a: Points,
  b: Points,
  tolerance: Points = POINT_TOLERANCE,
): boolean {
  return Math.abs(a - b) <= tolerance;
}
