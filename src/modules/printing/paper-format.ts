import type { Dimensions } from "../geometry/dimensions";
import type { Millimeters } from "../geometry/units";
import { InvalidPaperFormatError } from "./errors";

/**
 * Formatos de papel soportados por el MVP. Ver docs/printing.md §8.
 */
export type PaperFormat = "A4" | "A3" | "LETTER";

export type PaperOrientation = "PORTRAIT" | "LANDSCAPE";

/** El tamaño de papel es una dimensión física como cualquier otra del dominio. */
export type PaperSize = Dimensions;

/**
 * Única fuente de verdad de las dimensiones de papel.
 *
 * Se almacenan como lado corto y lado largo porque la orientación se resuelve
 * a partir de ellos: PORTRAIT usa el lado corto como ancho y LANDSCAPE al
 * revés. Ver docs/printing.md §9.
 */
const PAPER_SIDES: Record<
  PaperFormat,
  { readonly shortSide: Millimeters; readonly longSide: Millimeters }
> = {
  A4: { shortSide: 210, longSide: 297 },
  A3: { shortSide: 297, longSide: 420 },
  LETTER: { shortSide: 215.9, longSide: 279.4 },
};

export const PAPER_FORMATS: readonly PaperFormat[] = Object.keys(
  PAPER_SIDES,
) as PaperFormat[];

export function paperSize(
  format: PaperFormat,
  orientation: PaperOrientation,
): PaperSize {
  const sides = PAPER_SIDES[format];

  if (!sides) {
    throw new InvalidPaperFormatError(`Unsupported paper format: ${format}.`);
  }

  return orientation === "PORTRAIT"
    ? { width: sides.shortSide, height: sides.longSide }
    : { width: sides.longSide, height: sides.shortSide };
}
