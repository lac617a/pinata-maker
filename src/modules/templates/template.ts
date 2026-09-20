import {
  boundingBoxDimensions,
  type BoundingBox,
} from "../geometry/bounding-box";
import {
  templateGeometryBounds,
  type TemplateGeometry,
} from "../geometry/template-geometry";
import type { Millimeters, SquareMillimeters } from "../geometry/units";

/**
 * Papel que la plantilla convierte en una piñata.
 *
 * Los roles del MVP son los que produce la extrusión perimetral. No añadir
 * roles sin una necesidad de dominio real. Ver docs/template.md §18 y §111.
 */
export type PieceRole = "FRONT" | "BACK" | "SIDE";

/**
 * Pieza recortable.
 *
 * Su geometría es una `TemplateGeometry` completa —contorno, cortes y
 * dobleces— y no un simple polígono, porque una pieza lateral lleva sus
 * propias líneas de doblez. Eso además la deja lista para imprimirse sin
 * traducción intermedia. Ver docs/template.md §16 y §38.
 */
export type TemplatePiece = {
  /** Identidad legible, la misma que se imprime en la hoja: `SIDE-3`. */
  readonly id: string;
  readonly role: PieceRole;
  readonly geometry: TemplateGeometry;
};

/**
 * Versión de la derivación.
 *
 * Permite saber con qué reglas se construyó una plantilla guardada cuando el
 * reparto de pestañas o de dobleces cambie. Ver docs/template.md §94.
 */
export const TEMPLATE_DERIVATION_VERSION = "1.0";

export type Template = {
  readonly name: string;
  /** Dimensiones de la figura, no de la suma de sus piezas. */
  readonly width: Millimeters;
  readonly height: Millimeters;
  readonly depth: Millimeters;
  /**
   * Piezas en orden de montaje. Las laterales aparecen en el orden del
   * anillo, que es el que necesita el ensamblaje.
   */
  readonly pieces: readonly TemplatePiece[];
  readonly derivationVersion: string;
};

export function templatePiecesWithRole(
  template: Template,
  role: PieceRole,
): TemplatePiece[] {
  return template.pieces.filter((piece) => piece.role === role);
}

export function templatePieceById(
  template: Template,
  id: string,
): TemplatePiece | undefined {
  return template.pieces.find((piece) => piece.id === id);
}

/**
 * Lo que la plantilla va a costar en papel.
 *
 * Se mide sobre el rectángulo que ocupa cada pieza, no sobre su superficie
 * exacta: lo que se imprime y se recorta es el rectángulo, y la diferencia es
 * recorte que el usuario tira.
 *
 * Existe para poder avisar antes de generar el documento: descubrir que una
 * plantilla ocupa cuarenta hojas después de esperar el procesado es una mala
 * experiencia evitable. Ver docs/template.md §120.
 */
export type TemplateFootprint = {
  readonly pieceCount: number;
  readonly totalArea: SquareMillimeters;
  readonly largestPiece: { readonly id: string; readonly area: SquareMillimeters };
};

export function templateFootprint(template: Template): TemplateFootprint {
  const areas = template.pieces.map((piece) => ({
    id: piece.id,
    area: boundingArea(templateGeometryBounds(piece.geometry)),
  }));

  const largestPiece = areas.reduce((largest, candidate) =>
    candidate.area > largest.area ? candidate : largest,
  );

  return {
    pieceCount: template.pieces.length,
    totalArea: areas.reduce((total, piece) => total + piece.area, 0),
    largestPiece,
  };
}

function boundingArea(bounds: BoundingBox): SquareMillimeters {
  const size = boundingBoxDimensions(bounds);

  return size.width * size.height;
}
