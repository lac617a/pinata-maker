import { AmbiguousSubjectError, EmptyMaskError } from "./errors";
import { createBinaryMask, maskIndex, type BinaryMask } from "./mask";
import type { PixelBounds } from "./pixel-contour";

/**
 * Región conexa de la máscara.
 *
 * Ver docs/image-processing.md §25.
 */
export type MaskComponent = {
  readonly id: number;
  /** Número de pixels de la región. */
  readonly area: number;
  readonly bounds: PixelBounds;
};

export type ComponentLabeling = {
  /** `0` fondo; cualquier otro valor identifica una región. */
  readonly labels: Int32Array;
  /** Ordenadas de mayor a menor área, de forma estable. */
  readonly components: readonly MaskComponent[];
};

export type MainSubject = {
  readonly component: MaskComponent;
  /**
   * Regiones que quedan fuera de la plantilla.
   *
   * Se devuelven en lugar de descartarse en silencio para que la interfaz
   * pueda avisar de que la imagen tenía más de una figura.
   * Ver docs/image-processing.md §27.
   */
  readonly discarded: readonly MaskComponent[];
};

/**
 * Proporción a partir de la cual una segunda región deja de ser ruido.
 *
 * Por debajo de ella, quedarse con la mayor es una decisión evidente. Por
 * encima, la imagen tiene dos figuras comparables y el sistema no puede
 * elegir por el usuario. Ver docs/image-processing.md §25 y §26.
 */
export const AMBIGUOUS_COMPONENT_RATIO = 0.5;

/**
 * Agrupa los pixels de la figura en regiones conexas.
 *
 * Usa vecindad de 8 para la figura: dos pixels que se tocan por una esquina
 * forman una sola pieza física, porque el papel no se separa ahí.
 * Ver docs/image-processing.md §25.
 */
export function labelForegroundComponents(mask: BinaryMask): ComponentLabeling {
  const labels = new Int32Array(mask.width * mask.height);
  const components: MaskComponent[] = [];
  const stack: number[] = [];

  let nextId = 0;

  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const start = maskIndex(mask, x, y);

      if (mask.foreground[start] !== 1 || labels[start] !== 0) {
        continue;
      }

      const id = ++nextId;
      let area = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;

      labels[start] = id;
      stack.push(start);

      // Recorrido iterativo: una figura grande desbordaría la pila de
      // llamadas si el recorrido fuese recursivo.
      while (stack.length > 0) {
        const index = stack.pop() as number;
        const pixelX = index % mask.width;
        const pixelY = (index - pixelX) / mask.width;

        area++;
        minX = Math.min(minX, pixelX);
        minY = Math.min(minY, pixelY);
        maxX = Math.max(maxX, pixelX);
        maxY = Math.max(maxY, pixelY);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighbourX = pixelX + dx;
            const neighbourY = pixelY + dy;

            if (
              neighbourX < 0 ||
              neighbourY < 0 ||
              neighbourX >= mask.width ||
              neighbourY >= mask.height
            ) {
              continue;
            }

            const neighbour = maskIndex(mask, neighbourX, neighbourY);

            if (mask.foreground[neighbour] !== 1 || labels[neighbour] !== 0) {
              continue;
            }

            labels[neighbour] = id;
            stack.push(neighbour);
          }
        }
      }

      components.push({
        id,
        area,
        // Los límites cubren el pixel entero, no su esquina superior
        // izquierda, para que una región de un pixel mida 1 × 1.
        bounds: { minX, minY, maxX: maxX + 1, maxY: maxY + 1 },
      });
    }
  }

  if (components.length === 0) {
    throw new EmptyMaskError(
      "The mask contains no foreground pixel: the image has no detectable figure.",
    );
  }

  // El orden por identificador es el del recorrido, así que el desempate por
  // área mantiene un resultado reproducible.
  components.sort((a, b) => b.area - a.area || a.id - b.id);

  return { labels, components };
}

/**
 * Decide qué región representa la figura que el usuario quiere recortar.
 *
 * La estrategia es explícita —la de mayor área— y falla cuando hay otra
 * comparable, en lugar de unirlas o quedarse con una al azar. Cuál elegir en
 * ese caso es una decisión de producto todavía sin tomar.
 * Ver docs/image-processing.md §25, §26 y §27.
 */
export function selectMainSubject(labeling: ComponentLabeling): MainSubject {
  const [main, ...rest] = labeling.components;

  const comparable = rest.filter(
    (component) => component.area >= main.area * AMBIGUOUS_COMPONENT_RATIO,
  );

  if (comparable.length > 0) {
    throw new AmbiguousSubjectError(
      `The image contains ${comparable.length + 1} figures of comparable size; the template needs a single one.`,
    );
  }

  return { component: main, discarded: rest };
}

/**
 * Máscara con una sola región.
 *
 * El contorno se extrae de aquí: dejar las regiones sueltas produciría trazos
 * que no pertenecen a la plantilla.
 */
export function isolateComponent(
  mask: BinaryMask,
  labeling: ComponentLabeling,
  component: MaskComponent,
): BinaryMask {
  const foreground = new Uint8Array(mask.foreground.length);

  for (let index = 0; index < labeling.labels.length; index++) {
    foreground[index] = labeling.labels[index] === component.id ? 1 : 0;
  }

  return createBinaryMask(mask.width, mask.height, foreground);
}
