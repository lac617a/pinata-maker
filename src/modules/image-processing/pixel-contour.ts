import { InvalidContourError } from "./errors";

/**
 * Unidad del espacio de imagen.
 *
 * Un valor en pixels describe una posición dentro de la imagen, nunca una
 * medida física. Existe como tipo propio para que no pueda confundirse con
 * `Millimeters`. Ver docs/image-processing.md §4 y docs/geometry.md §5.
 */
export type Pixels = number;

/**
 * Posición dentro de la imagen.
 *
 * El sistema de coordenadas coincide deliberadamente con el del dominio
 * (origen arriba-izquierda, X a la derecha, Y hacia abajo), de modo que la
 * conversión a milímetros no necesita invertir ningún eje.
 * Ver docs/image-processing.md §35.
 */
export type PixelPoint = {
  readonly x: Pixels;
  readonly y: Pixels;
};

export type PixelSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

export type PixelBounds = {
  readonly minX: Pixels;
  readonly minY: Pixels;
  readonly maxX: Pixels;
  readonly maxY: Pixels;
};

/** Un contorno necesita tres vértices para delimitar una superficie. */
const MINIMUM_CONTOUR_POINTS = 3;

/**
 * Limpia un contorno recién extraído de una máscara.
 *
 * Elimina puntos consecutivos repetidos y el punto de cierre duplicado que
 * algunos extractores añaden al final. Los puntos no finitos se rechazan en
 * lugar de repararse: una geometría corrupta no debe entrar al dominio
 * disfrazada de geometría válida. Ver docs/image-processing.md §37, §38 y §39.
 */
export function cleanPixelContour(
  points: readonly PixelPoint[],
): PixelPoint[] {
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new InvalidContourError(
        `Contour points must be finite pixel coordinates, received (${point.x}, ${point.y}).`,
      );
    }
  }

  const cleaned = points.filter(
    (point, index) => index === 0 || !samePixel(points[index - 1], point),
  );

  if (
    cleaned.length > 1 &&
    samePixel(cleaned[0], cleaned[cleaned.length - 1])
  ) {
    cleaned.pop();
  }

  if (cleaned.length < MINIMUM_CONTOUR_POINTS) {
    throw new InvalidContourError(
      `A contour requires at least ${MINIMUM_CONTOUR_POINTS} distinct points, received ${cleaned.length}.`,
    );
  }

  return cleaned;
}

/**
 * Elimina los vértices que no cambian la forma del contorno.
 *
 * Un contorno recién extraído de una máscara avanza pixel a pixel, así que un
 * lado recto de cien pixels llega con noventa y nueve vértices intermedios.
 * Quitarlos no pierde nada: la figura es exactamente la misma y la
 * simplificación posterior trabaja sobre muchos menos puntos.
 *
 * El recorrido es cíclico porque un contorno cerrado no tiene principio: el
 * punto por el que empezó el trazado suele caer en mitad de un lado recto.
 * Ver docs/image-processing.md §37 y §40.
 */
export function removeCollinearPixels(
  points: readonly PixelPoint[],
): PixelPoint[] {
  if (points.length < MINIMUM_CONTOUR_POINTS) {
    return [...points];
  }

  const kept = points.filter((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];

    const cross =
      (current.x - previous.x) * (next.y - current.y) -
      (current.y - previous.y) * (next.x - current.x);

    return cross !== 0;
  });

  // Una figura degenerada —todos sus puntos alineados— se devuelve intacta
  // para que la rechace quien sepa por qué es inválida.
  return kept.length >= MINIMUM_CONTOUR_POINTS ? kept : [...points];
}

export function pixelContourBounds(
  points: readonly PixelPoint[],
): PixelBounds {
  if (points.length === 0) {
    throw new InvalidContourError(
      "An empty contour has no bounds in the image.",
    );
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Tamaño que ocupa la figura dentro de la imagen.
 *
 * Se rechaza un contorno plano porque no puede escalarse a una figura física:
 * no tendría superficie. Ver docs/image-processing.md §59.
 */
export function pixelContourSize(bounds: PixelBounds): PixelSize {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (width <= 0 || height <= 0) {
    throw new InvalidContourError(
      `A contour must cover an area in the image, received ${width} × ${height} px.`,
    );
  }

  return { width, height };
}

function samePixel(a: PixelPoint, b: PixelPoint): boolean {
  return a.x === b.x && a.y === b.y;
}
