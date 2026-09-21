import {
  type BoundingBox,
  boundingBoxDimensions,
  createBoundingBox,
} from "@/modules/geometry/bounding-box";
import {
  createDimensions,
  type Dimensions,
} from "@/modules/geometry/dimensions";
import {
  GEOMETRY_TOLERANCE_MM,
  isFiniteMillimeters,
  type Millimeters,
} from "@/modules/geometry/units";

import { InvalidOverlapError } from "./errors";
import { calculatePrintableArea, type Margins } from "./margins";
import type { PaperSize } from "./paper-format";

/** Solapamiento inicial recomendado por el producto. Ver docs/printing.md §45. */
export const DEFAULT_OVERLAP_MM: Millimeters = 10;

/**
 * Versión del algoritmo de layout.
 *
 * Permite reproducir documentos generados con versiones anteriores cuando el
 * algoritmo cambie. Ver docs/printing.md §80.
 */
export const LAYOUT_VERSION = "1.0";

/**
 * Región de la plantilla que cubre una hoja física.
 *
 * `globalBounds` está expresado en el sistema de coordenadas global de la
 * plantilla, no en coordenadas locales de la página: la conversión a
 * coordenadas locales pertenece al recorte de geometría.
 * Ver docs/geometry.md §52 y docs/printing.md §23.
 */
export type PrintPageRegion = {
  /** Identificador derivado del layout: fila en letras, columna en números. */
  readonly label: string;
  readonly pageNumber: number;
  readonly row: number;
  readonly column: number;
  readonly globalBounds: BoundingBox;
};

export type PageLayout = {
  readonly layoutVersion: string;
  readonly pages: readonly PrintPageRegion[];
  readonly rows: number;
  readonly columns: number;
  readonly printableArea: Dimensions;
  /** Desplazamiento entre orígenes de páginas consecutivas. */
  readonly step: Dimensions;
};

export type PageLayoutInput = {
  readonly templateBounds: BoundingBox;
  readonly paper: PaperSize;
  readonly margins: Margins;
  readonly overlap: Millimeters;
};

/**
 * Divide una plantilla en las hojas necesarias para imprimirla a tamaño real.
 *
 * El algoritmo nunca escala ni deforma: solo determina qué región global
 * corresponde a cada hoja. Una plantilla de 800 × 1000 mm sigue midiendo
 * 800 × 1000 mm después del tiling. Ver docs/printing.md §20 y §100.
 */
export function calculatePageLayout(input: PageLayoutInput): PageLayout {
  const { templateBounds, paper, margins, overlap } = input;

  const bounds = createBoundingBox(templateBounds);
  const template = boundingBoxDimensions(bounds);
  const printableArea = calculatePrintableArea(paper, margins);

  assertValidOverlap(overlap, printableArea);

  const step = createDimensions(
    printableArea.width - overlap,
    printableArea.height - overlap,
  );

  const columns = countPages(template.width, printableArea.width, step.width);
  const rows = countPages(template.height, printableArea.height, step.height);

  const pages: PrintPageRegion[] = [];

  // Orden determinista: arriba → abajo, izquierda → derecha.
  // Ver docs/printing.md §22.
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const minX = bounds.minX + column * step.width;
      const minY = bounds.minY + row * step.height;

      pages.push({
        label: pageLabel(row, column),
        pageNumber: row * columns + column + 1,
        row,
        column,
        globalBounds: createBoundingBox({
          minX,
          minY,
          maxX: minX + printableArea.width,
          maxY: minY + printableArea.height,
        }),
      });
    }
  }

  return {
    layoutVersion: LAYOUT_VERSION,
    pages,
    rows,
    columns,
    printableArea,
    step,
  };
}

/**
 * Número de hojas necesarias para cubrir una longitud de la plantilla.
 *
 * No basta con dividir entre el tamaño del papel: los márgenes reducen el área
 * utilizable y el solapamiento hace que cada hoja adicional aporte solo un
 * paso. Ver docs/geometry.md §57.
 */
function countPages(
  templateLength: Millimeters,
  printableLength: Millimeters,
  step: Millimeters,
): number {
  const uncovered = templateLength - printableLength;

  if (uncovered <= GEOMETRY_TOLERANCE_MM) {
    return 1;
  }

  // La tolerancia evita una hoja extra cuando el excedente es ruido de coma
  // flotante en lugar de una diferencia física real.
  return 1 + Math.ceil((uncovered - GEOMETRY_TOLERANCE_MM) / step);
}

/**
 * Identidad de una página dentro de la retícula: fila en letras y columna en
 * números, como `A1` o `B3`.
 *
 * La identidad se deriva del layout y no de la posición en un array, de modo
 * que dos generaciones con la misma configuración producen las mismas
 * etiquetas. Ver docs/printing.md §36 y docs/PRD.md §14.
 */
export function pageLabel(row: number, column: number): string {
  return `${rowLabel(row)}${column + 1}`;
}

/** Etiquetas de fila A, B, … Z, AA, AB, … */
function rowLabel(row: number): string {
  let label = "";

  for (
    let remaining = row;
    remaining >= 0;
    remaining = Math.floor(remaining / 26) - 1
  ) {
    label = String.fromCharCode(65 + (remaining % 26)) + label;
  }

  return label;
}

function assertValidOverlap(
  overlap: Millimeters,
  printableArea: Dimensions,
): void {
  if (!isFiniteMillimeters(overlap) || overlap < 0) {
    throw new InvalidOverlapError(
      `Overlap must be a finite value of at least 0 mm, received ${overlap}.`,
    );
  }

  // Un solapamiento igual o mayor al área imprimible produciría un paso nulo o
  // negativo: las páginas no avanzarían. Ver docs/geometry.md §55.
  if (overlap >= printableArea.width || overlap >= printableArea.height) {
    throw new InvalidOverlapError(
      `Overlap of ${overlap} mm must be smaller than the printable area of ${printableArea.width} × ${printableArea.height} mm.`,
    );
  }
}
