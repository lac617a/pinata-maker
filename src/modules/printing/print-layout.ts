import {
  boundingBoxDimensions,
  type BoundingBox,
} from "../geometry/bounding-box";
import type { Dimensions } from "../geometry/dimensions";
import type { Scale } from "../geometry/scale";
import {
  templateGeometryBounds,
  type TemplateGeometry,
} from "../geometry/template-geometry";
import type { Millimeters } from "../geometry/units";
import { generateAlignmentMarks, type AlignmentMark } from "./alignment";
import {
  DEFAULT_CALIBRATION_LENGTH_MM,
  placeCalibrationMark,
  type CalibrationMark,
} from "./calibration";
import {
  DEFAULT_MARGIN_MM,
  uniformMargins,
  type Margins,
} from "./margins";
import { clipGeometryToPage, type TemplatePageGeometry } from "./page-geometry";
import {
  paperSize,
  type PaperFormat,
  type PaperOrientation,
  type PaperSize,
} from "./paper-format";
import {
  calculatePageLayout,
  DEFAULT_OVERLAP_MM,
  LAYOUT_VERSION,
} from "./tiling";

/**
 * Escala de impresión del MVP.
 *
 * `1` significa que un milímetro de la geometría es un milímetro impreso. El
 * MVP solo admite tamaño real: imprimir un molde a otra escala produciría una
 * piñata de dimensiones distintas a las pedidas.
 * Ver docs/printing.md §14 y §17.
 */
export const PRINT_SCALE_ACTUAL_SIZE: Scale = 1;

export type PaperConfiguration = {
  readonly format: PaperFormat;
  readonly orientation: PaperOrientation;
  readonly margins: Margins;
};

export type PrintConfiguration = {
  readonly paper: PaperConfiguration;
  readonly overlap: Millimeters;
  readonly calibrationLength: Millimeters;
};

/** Configuración inicial recomendada por el producto. Ver docs/printing.md §45. */
export const DEFAULT_PRINT_CONFIGURATION: PrintConfiguration = {
  paper: {
    format: "A4",
    orientation: "PORTRAIT",
    margins: uniformMargins(DEFAULT_MARGIN_MM),
  },
  overlap: DEFAULT_OVERLAP_MM,
  calibrationLength: DEFAULT_CALIBRATION_LENGTH_MM,
};

/**
 * Hoja física lista para renderizar.
 *
 * Contiene todo lo que el renderer necesita y nada que deba recalcular.
 * Ver docs/printing.md §51 y §66.
 */
export type PrintPage = {
  /** Identidad derivada de la retícula, por ejemplo `B3`. */
  readonly id: string;
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly row: number;
  readonly column: number;
  readonly paper: PaperSize;
  readonly printableArea: Dimensions;
  /** Región de la plantilla que cubre esta hoja, en coordenadas globales. */
  readonly globalBounds: BoundingBox;
  readonly geometry: TemplatePageGeometry;
  readonly alignmentMarks: readonly AlignmentMark[];
  readonly calibrationMark: CalibrationMark | undefined;
};

export type PrintLayout = {
  readonly layoutVersion: string;
  readonly scale: Scale;
  readonly pages: readonly PrintPage[];
  readonly rows: number;
  readonly columns: number;
  /** Dimensiones físicas de la plantilla completa, no de la suma de hojas. */
  readonly totalWidth: Millimeters;
  readonly totalHeight: Millimeters;
};

/**
 * Reparte una plantilla entre las hojas necesarias para imprimirla.
 *
 * El resultado es reproducible: la misma geometría con la misma configuración
 * y la misma `layoutVersion` produce siempre las mismas páginas.
 * Ver docs/printing.md §29 y §81.
 */
export function createPrintLayout(
  geometry: TemplateGeometry,
  configuration: PrintConfiguration = DEFAULT_PRINT_CONFIGURATION,
): PrintLayout {
  const paper = paperSize(
    configuration.paper.format,
    configuration.paper.orientation,
  );

  const templateBounds = templateGeometryBounds(geometry);
  const templateSize = boundingBoxDimensions(templateBounds);

  const grid = calculatePageLayout({
    templateBounds,
    paper,
    margins: configuration.paper.margins,
    overlap: configuration.overlap,
  });

  const totalPages = grid.pages.length;

  const pages = grid.pages.map((region): PrintPage => {
    const pageGeometry = clipGeometryToPage(geometry, region);

    return {
      id: region.label,
      pageNumber: region.pageNumber,
      totalPages,
      row: region.row,
      column: region.column,
      paper,
      printableArea: grid.printableArea,
      globalBounds: region.globalBounds,
      geometry: pageGeometry,
      alignmentMarks: generateAlignmentMarks({
        page: region,
        rows: grid.rows,
        columns: grid.columns,
        printableArea: grid.printableArea,
        overlap: configuration.overlap,
      }),
      calibrationMark: placeCalibrationMark({
        geometry: pageGeometry,
        printableArea: grid.printableArea,
        length: configuration.calibrationLength,
      }),
    };
  });

  return {
    layoutVersion: LAYOUT_VERSION,
    scale: PRINT_SCALE_ACTUAL_SIZE,
    pages,
    rows: grid.rows,
    columns: grid.columns,
    totalWidth: templateSize.width,
    totalHeight: templateSize.height,
  };
}
