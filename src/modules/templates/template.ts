import {
  type BoundingBox,
  boundingBoxDimensions,
} from "@/modules/geometry/bounding-box";
import {
  type TemplateGeometry,
  templateGeometryBounds,
} from "@/modules/geometry/template-geometry";
import type { Millimeters, SquareMillimeters } from "@/modules/geometry/units";

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
  /**
   * Dónde va la imagen de origen, si la plantilla salió de una.
   *
   * Es decoración: la geometría ya está calculada y la imagen no es fuente de
   * verdad del molde (docs/pdf.md §24). Se guarda con la plantilla porque el
   * documento se genera en el servidor, desde la versión publicada, y ahí no
   * queda ningún otro rastro de cómo se correspondían imagen y silueta.
   */
  readonly referenceImage?: ReferenceImagePlacement;
};

/**
 * Rectángulo que ocupa la imagen de origen, en mm, respecto a la pieza
 * `FRONT`.
 *
 * Puede empezar en negativo: la imagen suele tener margen alrededor de la
 * figura, y la silueta empieza en (0,0). `BACK` es el reflejo de `FRONT`
 * dentro de su ancho, así que la imagen se refleja igual.
 * Ver docs/image-processing.md §109.
 */
export type ReferenceImagePlacement = {
  readonly x: Millimeters;
  readonly y: Millimeters;
  readonly width: Millimeters;
  readonly height: Millimeters;
};

/**
 * La imagen de origen colocada sobre una cara, en coordenadas de esa pieza.
 *
 * Para `BACK` la refleja dentro del ancho de la cara —x → ancho − x—, igual
 * que la derivación refleja la silueta. `mirrored` avisa a quien dibuje de
 * que la imagen también va volteada, no solo desplazada.
 */
export function referenceImageOnFace(
  template: Template,
  piece: TemplatePiece,
): {
  readonly placement: ReferenceImagePlacement;
  readonly mirrored: boolean;
} | null {
  const placement = template.referenceImage;

  if (!placement || piece.role === "SIDE") {
    return null;
  }

  if (piece.role === "FRONT") {
    return { placement, mirrored: false };
  }

  const faceWidth = templateGeometryBounds(piece.geometry).maxX;

  return {
    placement: {
      ...placement,
      x: faceWidth - (placement.x + placement.width),
    },
    mirrored: true,
  };
}

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
  readonly largestPiece: {
    readonly id: string;
    readonly area: SquareMillimeters;
  };
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
