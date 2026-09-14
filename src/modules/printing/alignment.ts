import type { Dimensions } from "../geometry/dimensions";
import type { Point } from "../geometry/point";
import type { Millimeters } from "../geometry/units";
import { pageLabel, type PrintPageRegion } from "./tiling";

export type PageEdge = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

/**
 * Referencia física que permite superponer dos hojas adyacentes.
 *
 * La marca se sitúa en el centro de la franja compartida, de modo que ambas
 * páginas la imprimen en la misma posición física global: al solapar las
 * hojas, las dos marcas coinciden.
 *
 * `position` está en coordenadas locales de la página a la que pertenece.
 * Ver docs/printing.md §35 y docs/geometry.md §61.
 */
export type AlignmentMark = {
  /** Identidad compartida por las dos páginas que une, por ejemplo `A1-A2-1`. */
  readonly id: string;
  /** Borde de esta página en el que se encuentra la marca. */
  readonly edge: PageEdge;
  /** Etiqueta de la página con la que se alinea. */
  readonly connectsTo: string;
  readonly position: Point;
};

/**
 * Posiciones a lo largo del borde compartido, como fracción de su longitud.
 *
 * Se usan dos marcas por borde porque una sola no permite corregir el giro de
 * la hoja. Se separan de las esquinas para no confundirse con las marcas de
 * los bordes contiguos.
 */
const MARK_POSITIONS = [0.25, 0.75] as const;

export type AlignmentInput = {
  readonly page: PrintPageRegion;
  readonly rows: number;
  readonly columns: number;
  readonly printableArea: Dimensions;
  readonly overlap: Millimeters;
};

/**
 * Genera las marcas de las páginas vecinas.
 *
 * Los bordes exteriores de la retícula no reciben marcas: no hay ninguna hoja
 * con la que alinearlos.
 */
export function generateAlignmentMarks(
  input: AlignmentInput,
): AlignmentMark[] {
  const { page, rows, columns, printableArea, overlap } = input;
  const { row, column } = page;

  const marks: AlignmentMark[] = [];

  if (row > 0) {
    marks.push(
      ...horizontalEdgeMarks({
        edge: "TOP",
        y: overlap / 2,
        printableArea,
        connectsTo: pageLabel(row - 1, column),
        sharedId: sharedEdgeId(pageLabel(row - 1, column), page.label),
      }),
    );
  }

  if (column < columns - 1) {
    marks.push(
      ...verticalEdgeMarks({
        edge: "RIGHT",
        x: printableArea.width - overlap / 2,
        printableArea,
        connectsTo: pageLabel(row, column + 1),
        sharedId: sharedEdgeId(page.label, pageLabel(row, column + 1)),
      }),
    );
  }

  if (row < rows - 1) {
    marks.push(
      ...horizontalEdgeMarks({
        edge: "BOTTOM",
        y: printableArea.height - overlap / 2,
        printableArea,
        connectsTo: pageLabel(row + 1, column),
        sharedId: sharedEdgeId(page.label, pageLabel(row + 1, column)),
      }),
    );
  }

  if (column > 0) {
    marks.push(
      ...verticalEdgeMarks({
        edge: "LEFT",
        x: overlap / 2,
        printableArea,
        connectsTo: pageLabel(row, column - 1),
        sharedId: sharedEdgeId(pageLabel(row, column - 1), page.label),
      }),
    );
  }

  return marks;
}

function verticalEdgeMarks(input: {
  edge: PageEdge;
  x: Millimeters;
  printableArea: Dimensions;
  connectsTo: string;
  sharedId: string;
}): AlignmentMark[] {
  return MARK_POSITIONS.map((fraction, index) => ({
    id: `${input.sharedId}-${index + 1}`,
    edge: input.edge,
    connectsTo: input.connectsTo,
    position: { x: input.x, y: input.printableArea.height * fraction },
  }));
}

function horizontalEdgeMarks(input: {
  edge: PageEdge;
  y: Millimeters;
  printableArea: Dimensions;
  connectsTo: string;
  sharedId: string;
}): AlignmentMark[] {
  return MARK_POSITIONS.map((fraction, index) => ({
    id: `${input.sharedId}-${index + 1}`,
    edge: input.edge,
    connectsTo: input.connectsTo,
    position: { x: input.printableArea.width * fraction, y: input.y },
  }));
}

/**
 * Identidad de un borde compartido.
 *
 * Se construye siempre con la página superior o izquierda en primer lugar,
 * para que las dos hojas que comparten el borde generen el mismo nombre.
 */
function sharedEdgeId(first: string, second: string): string {
  return `${first}-${second}`;
}
