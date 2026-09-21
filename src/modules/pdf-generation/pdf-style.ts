import type { Millimeters } from "@/modules/geometry/units";

import type { StrokeRole, TextRole } from "./page-drawing";

/**
 * Apariencia de los trazos y los textos del documento.
 *
 * Los valores viven aquí y no repartidos por el adaptador para que cambiar el
 * aspecto de una línea de doblez sea un cambio en un solo sitio.
 * Ver docs/pdf.md §27 y §28.
 *
 * Todas las medidas están en milímetros: un grosor de línea también es una
 * magnitud física, y expresarlo en unidades del PDF aquí obligaría a convertir
 * en dos lugares distintos. Ver docs/pdf.md §29 y §30.
 */

export type PdfLineStyle = {
  readonly width: Millimeters;
  /** Patrón de guion y hueco. Ausente significa línea continua. */
  readonly dash?: readonly Millimeters[];
};

/**
 * El documento es monocromo.
 *
 * El color no aporta información que el usuario necesite —la semántica se
 * distingue por el trazo— y una impresora en blanco y negro convertiría los
 * colores en grises indistinguibles.
 */
export const STROKE_STYLES: Record<StrokeRole, PdfLineStyle> = {
  // El contorno es lo que se recorta: es la línea más marcada de la hoja.
  CONTOUR: { width: 0.35 },
  HOLE: { width: 0.35 },
  CUT: { width: 0.35 },
  // Discontinua, porque doblar y cortar son acciones distintas y confundirlas
  // destruye la pieza. Ver docs/pdf.md §27.
  FOLD: { width: 0.25, dash: [3, 2] },
  // Auxiliares: deben verse sin competir con las líneas de la plantilla.
  ALIGNMENT: { width: 0.2 },
  CALIBRATION: { width: 0.3 },
};

/** Altura nominal del texto, también en milímetros. */
export const TEXT_SIZES: Record<TextRole, Millimeters> = {
  PAGE_LABEL: 3,
  ALIGNMENT_LABEL: 2.2,
  CALIBRATION_LABEL: 2.5,
  PRINT_WARNING: 2.5,
  COVER_TITLE: 5,
  COVER_TEXT: 3.5,
};

/**
 * Fuente del documento.
 *
 * Helvetica es una de las catorce fuentes estándar del formato: está
 * garantizada en cualquier lector sin incrustarla, y su codificación cubre los
 * acentos y la eñe del castellano. Ver docs/pdf.md §38, §39 y §41.
 */
export const DOCUMENT_FONT = "helvetica";
