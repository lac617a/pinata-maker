import {
  createDimensions,
  type Dimensions,
} from "@/modules/geometry/dimensions";
import {
  isFiniteMillimeters,
  type Millimeters,
} from "@/modules/geometry/units";

import { EmptyPrintableAreaError, InvalidMarginError } from "./errors";
import type { PaperSize } from "./paper-format";

/**
 * Márgenes físicos del documento.
 *
 * No representan el área no imprimible del hardware: una impresora puede tener
 * sus propias limitaciones físicas, que son una preocupación distinta.
 * Ver docs/printing.md §10 y §12.
 */
export type Margins = {
  readonly top: Millimeters;
  readonly right: Millimeters;
  readonly bottom: Millimeters;
  readonly left: Millimeters;
};

/** Margen inicial recomendado por el producto. Ver docs/printing.md §45. */
export const DEFAULT_MARGIN_MM: Millimeters = 5;

export function createMargins(margins: Margins): Margins {
  for (const [side, value] of Object.entries(margins)) {
    if (!isFiniteMillimeters(value)) {
      throw new InvalidMarginError(
        `Margin ${side} must be a finite value in millimeters, received ${value}.`,
      );
    }

    if (value < 0) {
      throw new InvalidMarginError(
        `Margin ${side} must not be negative, received ${value} mm.`,
      );
    }
  }

  return margins;
}

export function uniformMargins(value: Millimeters): Margins {
  return createMargins({
    top: value,
    right: value,
    bottom: value,
    left: value,
  });
}

/**
 * Área efectivamente utilizable de una hoja.
 *
 * El área imprimible siempre es menor que el papel; confundirlas produciría
 * plantillas cortadas en la impresión. Ver docs/printing.md §11 y §64.
 */
export function calculatePrintableArea(
  paper: PaperSize,
  margins: Margins,
): Dimensions {
  createMargins(margins);

  const width = paper.width - margins.left - margins.right;
  const height = paper.height - margins.top - margins.bottom;

  if (width <= 0 || height <= 0) {
    throw new EmptyPrintableAreaError(
      `Margins consume the entire sheet: ${paper.width} × ${paper.height} mm leaves ${width} × ${height} mm printable.`,
    );
  }

  return createDimensions(width, height);
}
