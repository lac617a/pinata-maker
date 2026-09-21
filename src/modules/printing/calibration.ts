import { createBoundingBox } from "@/modules/geometry/bounding-box";
import type { Dimensions } from "@/modules/geometry/dimensions";
import type { Point } from "@/modules/geometry/point";
import {
  isFiniteMillimeters,
  type Millimeters,
} from "@/modules/geometry/units";

import { InvalidCalibrationError } from "./errors";
import {
  pageGeometryIntersectsRectangle,
  type TemplatePageGeometry,
} from "./page-geometry";

/**
 * Regla impresa que permite comprobar físicamente la escala.
 *
 * Si el usuario mide la marca con una regla real y no obtiene su longitud
 * declarada, la impresión está aplicando un escalado.
 * Ver docs/printing.md §38 y §39.
 */
export type CalibrationMark = {
  readonly length: Millimeters;
  /** Extremo izquierdo de la regla, en coordenadas locales de la página. */
  readonly position: Point;
};

/** Longitud de referencia del MVP. Ver docs/printing.md §38. */
export const DEFAULT_CALIBRATION_LENGTH_MM: Millimeters = 100;

/**
 * Altura de la franja que ocupa la regla.
 *
 * Reserva espacio para las marcas de los extremos y para el texto que indica
 * la longitud, de modo que la comprobación se lea sin ambigüedad.
 */
export const CALIBRATION_BAND_HEIGHT_MM: Millimeters = 8;

export type CalibrationPlacement = {
  readonly geometry: TemplatePageGeometry;
  readonly printableArea: Dimensions;
  readonly length: Millimeters;
};

/**
 * Sitúa la regla en una esquina libre del área imprimible.
 *
 * Se prueban las esquinas en un orden fijo para que el resultado sea
 * reproducible, y se descarta cualquiera que cruce un trazo de la página: una
 * regla superpuesta al molde podría confundirse con una línea de corte.
 *
 * Devuelve `undefined` cuando la hoja no tiene ningún hueco disponible. En ese
 * caso la página se imprime sin regla y la referencia queda en la hoja de
 * instrucciones del documento.
 */
export function placeCalibrationMark(
  placement: CalibrationPlacement,
): CalibrationMark | undefined {
  const { geometry, printableArea, length } = placement;

  if (!isFiniteMillimeters(length) || length <= 0) {
    throw new InvalidCalibrationError(
      `Calibration length must be a finite value greater than 0 mm, received ${length}.`,
    );
  }

  if (
    length > printableArea.width ||
    CALIBRATION_BAND_HEIGHT_MM > printableArea.height
  ) {
    return undefined;
  }

  const left = 0;
  const right = printableArea.width - length;
  const top = 0;
  const bottom = printableArea.height - CALIBRATION_BAND_HEIGHT_MM;

  const corners = [
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: left, y: top },
    { x: right, y: top },
  ];

  for (const corner of corners) {
    const band = createBoundingBox({
      minX: corner.x,
      minY: corner.y,
      maxX: corner.x + length,
      maxY: corner.y + CALIBRATION_BAND_HEIGHT_MM,
    });

    if (pageGeometryIntersectsRectangle(geometry, band)) {
      continue;
    }

    return {
      length,
      // La línea se dibuja centrada en la franja reservada.
      position: { x: corner.x, y: corner.y + CALIBRATION_BAND_HEIGHT_MM / 2 },
    };
  }

  return undefined;
}
