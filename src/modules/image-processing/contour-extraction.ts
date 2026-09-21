import { InvalidContourError } from "./errors";
import { type BinaryMask, isForeground } from "./mask";
import {
  cleanPixelContour,
  type PixelPoint,
  removeCollinearPixels,
} from "./pixel-contour";

/**
 * Contorno de una figura tal y como sale de la máscara.
 *
 * `outer` delimita la pieza y cada hueco perfora su interior. Ambos siguen en
 * pixels: la conversión a milímetros ocurre después.
 * Ver docs/image-processing.md §33 y §34.
 */
export type MaskOutline = {
  readonly outer: PixelPoint[];
  readonly holes: readonly PixelPoint[][];
};

/**
 * Lado de un pixel que separa figura de fondo.
 *
 * El contorno se traza por las aristas de la retícula, no por los centros de
 * los pixels: así el trazo cae exactamente donde hay que cortar y no medio
 * pixel hacia dentro.
 */
type LatticeEdge = {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
};

/**
 * Extrae el contorno de una máscara que contiene una sola región.
 *
 * Recorre las aristas que separan figura de fondo y las encadena en trazos
 * cerrados. El resultado es exacto —sigue el borde de los pixels— y todavía
 * escalonado: suavizarlo es tarea de la simplificación posterior.
 * Ver docs/image-processing.md §33 y §41.
 *
 * Dos pixels que solo se tocan por una esquina se consideran unidos, igual
 * que al agrupar regiones: el papel no se separa ahí.
 */
export function traceMaskOutline(mask: BinaryMask): MaskOutline {
  const loops = traceLoops(collectBoundaryEdges(mask));

  const outer: PixelPoint[][] = [];
  const holes: PixelPoint[][] = [];

  for (const loop of loops) {
    // El sentido del recorrido distingue el borde exterior de un hueco: las
    // aristas se generan siempre con la figura del mismo lado.
    (signedArea(loop) > 0 ? outer : holes).push(
      removeCollinearPixels(cleanPixelContour(loop)),
    );
  }

  if (outer.length !== 1) {
    throw new InvalidContourError(
      `A template contour requires a single connected figure, the mask produced ${outer.length}.`,
    );
  }

  return { outer: outer[0], holes };
}

/**
 * Aristas entre figura y fondo, orientadas con la figura siempre al mismo
 * lado, de modo que encadenarlas produce trazos cerrados coherentes.
 */
function collectBoundaryEdges(mask: BinaryMask): LatticeEdge[] {
  const edges: LatticeEdge[] = [];

  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!isForeground(mask, x, y)) {
        continue;
      }

      if (!isForeground(mask, x, y - 1)) {
        edges.push({ fromX: x, fromY: y, toX: x + 1, toY: y });
      }

      if (!isForeground(mask, x + 1, y)) {
        edges.push({ fromX: x + 1, fromY: y, toX: x + 1, toY: y + 1 });
      }

      if (!isForeground(mask, x, y + 1)) {
        edges.push({ fromX: x + 1, fromY: y + 1, toX: x, toY: y + 1 });
      }

      if (!isForeground(mask, x - 1, y)) {
        edges.push({ fromX: x, fromY: y + 1, toX: x, toY: y });
      }
    }
  }

  if (edges.length === 0) {
    throw new InvalidContourError(
      "The mask has no boundary between figure and background.",
    );
  }

  return edges;
}

function traceLoops(edges: readonly LatticeEdge[]): PixelPoint[][] {
  const outgoing = new Map<string, LatticeEdge[]>();

  for (const edge of edges) {
    const key = vertexKey(edge.fromX, edge.fromY);
    const existing = outgoing.get(key);

    if (existing) {
      existing.push(edge);
    } else {
      outgoing.set(key, [edge]);
    }
  }

  const loops: PixelPoint[][] = [];

  for (const edge of edges) {
    if (!isAvailable(outgoing, edge)) {
      continue;
    }

    loops.push(traceLoopFrom(edge, outgoing));
  }

  return loops;
}

function traceLoopFrom(
  start: LatticeEdge,
  outgoing: Map<string, LatticeEdge[]>,
): PixelPoint[] {
  const points: PixelPoint[] = [{ x: start.fromX, y: start.fromY }];

  let current = take(outgoing, start);
  let direction = directionOf(current);

  // Cada arista recorrida se consume, así que el recorrido termina siempre.
  while (true) {
    const next = nextEdge(outgoing, current, direction);

    if (!next) {
      points.push({ x: current.toX, y: current.toY });
      return points;
    }

    const nextDirection = directionOf(next);

    // Solo se guarda el punto donde el trazo cambia de dirección: una recta
    // de cien pixels son dos puntos, no ciento uno.
    if (nextDirection.x !== direction.x || nextDirection.y !== direction.y) {
      points.push({ x: current.toX, y: current.toY });
    }

    current = next;
    direction = nextDirection;
  }
}

/**
 * Siguiente arista del trazo.
 *
 * En un vértice normal solo hay una continuación. Donde dos partes de la
 * figura se tocan en diagonal hay dos, y se elige la que mantiene el trazo
 * rodeando ambas: separarlas contradiría la vecindad con la que se agruparon
 * las regiones. Ver docs/image-processing.md §25.
 */
function nextEdge(
  outgoing: Map<string, LatticeEdge[]>,
  current: LatticeEdge,
  direction: PixelPoint,
): LatticeEdge | undefined {
  const candidates = outgoing.get(vertexKey(current.toX, current.toY));

  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  const chosen = candidates.reduce((best, candidate) =>
    turn(direction, directionOf(candidate)) < turn(direction, directionOf(best))
      ? candidate
      : best,
  );

  return take(outgoing, chosen);
}

/** Producto vectorial: ordena las continuaciones por el giro que suponen. */
function turn(from: PixelPoint, to: PixelPoint): number {
  return from.x * to.y - from.y * to.x;
}

function directionOf(edge: LatticeEdge): PixelPoint {
  return { x: edge.toX - edge.fromX, y: edge.toY - edge.fromY };
}

function isAvailable(
  outgoing: Map<string, LatticeEdge[]>,
  edge: LatticeEdge,
): boolean {
  return (outgoing.get(vertexKey(edge.fromX, edge.fromY)) ?? []).includes(edge);
}

function take(
  outgoing: Map<string, LatticeEdge[]>,
  edge: LatticeEdge,
): LatticeEdge {
  const candidates = outgoing.get(vertexKey(edge.fromX, edge.fromY));

  if (candidates) {
    const position = candidates.indexOf(edge);

    if (position !== -1) {
      candidates.splice(position, 1);
    }
  }

  return edge;
}

function vertexKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Área con signo del trazo.
 *
 * Su magnitud no interesa; su signo dice si el trazo rodea figura o hueco.
 */
function signedArea(points: readonly PixelPoint[]): number {
  let total = 0;

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    total += current.x * next.y - next.x * current.y;
  }

  return total / 2;
}
