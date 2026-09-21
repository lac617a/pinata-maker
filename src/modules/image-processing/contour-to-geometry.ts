import { boundingBoxDimensions } from "@/modules/geometry/bounding-box";
import type { Dimensions } from "@/modules/geometry/dimensions";
import type { Point } from "@/modules/geometry/point";
import {
  createPolygon,
  type Polygon,
  polygonBounds,
} from "@/modules/geometry/polygon";
import { type Millimeters, millimetersEqual } from "@/modules/geometry/units";

import { InvalidContourError } from "./errors";
import {
  cleanPixelContour,
  pixelContourBounds,
  pixelContourSize,
  type PixelPoint,
} from "./pixel-contour";
import { simplifyPixelContour } from "./simplification";

/**
 * Factor de conversión entre el espacio de imagen y el espacio físico.
 *
 * No es la `Scale` del dominio, que es adimensional: esta magnitud tiene
 * unidades (mm/px) y solo existe en este boundary.
 * Ver docs/image-processing.md §50.
 */
export type MillimetersPerPixel = number;

/**
 * Versión de la parte determinista del procesamiento.
 *
 * Permite saber con qué algoritmo se obtuvo una geometría almacenada cuando
 * la limpieza o la simplificación cambien. Ver docs/image-processing.md §13.
 */
export const CONTOUR_PROCESSOR_VERSION = "1.0";

/**
 * Tolerancia física por defecto de la simplificación.
 *
 * Medio milímetro queda por debajo de lo que puede seguirse recortando a
 * mano, así que reduce puntos sin alterar la figura que el usuario fabricará.
 * Ver docs/image-processing.md §44 y §75.
 */
export const DEFAULT_SIMPLIFICATION_TOLERANCE_MM: Millimeters = 0.5;

/**
 * Tolerancia mínima de simplificación, en pixels de la imagen.
 *
 * El contorno que entrega la extracción recorre el borde de los pixels, así
 * que avanza a escalones de un pixel. Esos escalones son un efecto de
 * rasterizar, no detalle de la figura, y una tolerancia menor que el escalón
 * no puede eliminarlos: el contorno se queda hecho una escalera.
 *
 * Las consecuencias no son cosméticas. Medido sobre una elipse de
 * 714,7 × 1000 mm a 1,43 mm por pixel:
 *
 * ```text
 * tolerancia   puntos   perímetro   error
 * 0,5 mm        1364      3429 mm   +26,4 %
 * 1,0 mm         732      3102 mm   +14,4 %
 * 2,0 mm          52      2712 mm     0,0 %
 * ```
 *
 * Un perímetro un 26 % largo produce una tira lateral que no cierra la
 * figura. Ver docs/image-processing.md §45 y docs/template.md §113.
 */
export const MINIMUM_PIXEL_TOLERANCE = 1.5;

export type PhysicalContourInput = {
  /** Contorno tal como lo entrega la extracción, en pixels de la imagen. */
  readonly contour: readonly PixelPoint[];
  /**
   * Huecos de la figura, en los mismos pixels.
   *
   * Se convierten con la escala y el origen del contorno exterior, para que
   * sigan perforándolo donde les corresponde.
   */
  readonly holes?: readonly (readonly PixelPoint[])[];
  /** Tamaño físico que el usuario quiere para la figura. */
  readonly targetDimensions: Dimensions;
  readonly simplificationTolerance?: Millimeters;
};

export type PhysicalContour = {
  /** Contorno cerrado en milímetros, normalizado con su origen en (0,0). */
  readonly polygon: Polygon;
  /** Huecos en milímetros, en el sistema de coordenadas del contorno. */
  readonly holes: readonly Polygon[];
  /**
   * Huecos que la simplificación dejó sin superficie.
   *
   * Un hueco más pequeño que la tolerancia física no puede recortarse, pero
   * desaparecer en silencio sería perder parte de la figura.
   * Ver docs/image-processing.md §24.
   */
  readonly holesBelowTolerance: number;
  /** Tamaño físico real resultante, que puede ser menor que el solicitado. */
  readonly dimensions: Dimensions;
  readonly millimetersPerPixel: MillimetersPerPixel;
  /**
   * Tolerancia realmente aplicada.
   *
   * Puede ser mayor que la pedida cuando la imagen no tiene resolución para
   * respetarla: no se puede exigir más precisión de la que el original
   * contiene.
   */
  readonly appliedSimplificationTolerance: Millimeters;
  /**
   * Indica que alcanzar exactamente las dos dimensiones pedidas exigiría
   * deformar la figura. El dominio nunca deforma; informa.
   */
  readonly requiresDistortionForExactFit: boolean;
  readonly processorVersion: string;
};

/**
 * Convierte un contorno detectado en la imagen en geometría física.
 *
 * Este es el único punto donde los pixels se transforman en milímetros.
 * A partir de aquí el dominio ya no conoce la imagen.
 * Ver docs/image-processing.md §47 y §94.
 *
 * La escala se deriva del tamaño del contorno, no del lienzo de la imagen:
 * cuando el usuario pide una piñata de 800 mm se refiere a la figura, no al
 * espacio vacío que la rodea en la foto.
 *
 * El ajuste es proporcional y contenido dentro de las dimensiones pedidas
 * (CONTAIN + preserveAspectRatio), el comportamiento seguro por defecto para
 * moldes. Ver docs/image-processing.md §55.
 */
export function convertContourToPhysicalGeometry(
  input: PhysicalContourInput,
): PhysicalContour {
  const {
    contour,
    targetDimensions,
    simplificationTolerance = DEFAULT_SIMPLIFICATION_TOLERANCE_MM,
  } = input;

  const cleaned = cleanPixelContour(contour);
  const sourceSize = pixelContourSize(pixelContourBounds(cleaned));

  const millimetersPerPixel = Math.min(
    targetDimensions.width / sourceSize.width,
    targetDimensions.height / sourceSize.height,
  );

  // Pedir menos que el tamaño de un pixel no afina el contorno: deja la
  // escalera de la rasterización intacta. Ver MINIMUM_PIXEL_TOLERANCE.
  const pixelTolerance = Math.max(
    simplificationTolerance / millimetersPerPixel,
    MINIMUM_PIXEL_TOLERANCE,
  );

  const simplified = simplifyPixelContour(cleaned, pixelTolerance);

  if (simplified.length < 3) {
    throw new InvalidContourError(
      `Simplifying with a tolerance of ${simplificationTolerance} mm left ${simplified.length} points, which cannot describe a figure.`,
    );
  }

  // La normalización se calcula sobre el contorno ya simplificado para que la
  // figura empiece exactamente en (0,0). Ver docs/image-processing.md §56.
  const bounds = pixelContourBounds(simplified);

  const points: Point[] = simplified.map((point) => ({
    x: (point.x - bounds.minX) * millimetersPerPixel,
    y: (point.y - bounds.minY) * millimetersPerPixel,
  }));

  const polygon = createPolygon(points, true);

  const toPhysical = (point: PixelPoint): Point => ({
    x: (point.x - bounds.minX) * millimetersPerPixel,
    y: (point.y - bounds.minY) * millimetersPerPixel,
  });

  const holes: Polygon[] = [];
  let holesBelowTolerance = 0;

  for (const hole of input.holes ?? []) {
    const simplifiedHole = simplifyPixelContour(
      cleanPixelContour(hole),
      pixelTolerance,
    );

    if (simplifiedHole.length < 3) {
      holesBelowTolerance++;
      continue;
    }

    holes.push(createPolygon(simplifiedHole.map(toPhysical), true));
  }

  return {
    polygon,
    dimensions: boundingBoxDimensions(polygonBounds(polygon)),
    holes,
    holesBelowTolerance,
    millimetersPerPixel,
    appliedSimplificationTolerance: pixelTolerance * millimetersPerPixel,
    // Se evalúa sobre el contorno limpio, antes de simplificar, para que la
    // respuesta dependa de la figura y no de la tolerancia elegida.
    requiresDistortionForExactFit:
      !millimetersEqual(
        sourceSize.width * millimetersPerPixel,
        targetDimensions.width,
      ) ||
      !millimetersEqual(
        sourceSize.height * millimetersPerPixel,
        targetDimensions.height,
      ),
    processorVersion: CONTOUR_PROCESSOR_VERSION,
  };
}
