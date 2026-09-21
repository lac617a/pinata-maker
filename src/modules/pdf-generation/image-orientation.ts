import { swapsSides } from "@/modules/image-processing/image-header";

/**
 * Transformación afín `x' = a·x + c·y + e`, `y' = b·x + d·y + f`, con el eje
 * y hacia abajo, como el resto del dibujo.
 */
export type AffineTransform = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Cómo dibujar los bytes tal cual para que ocupen `target` ya girados.
 *
 * Se dibuja la imagen guardada en `(0, 0, drawWidth, drawHeight)` y la
 * transformación la lleva a su sitio: un cuarto de vuelta, media o un
 * espejo, según diga la orientación EXIF. Sin recodificar la imagen: el
 * archivo del usuario no se toca (docs/pdf.md §97).
 *
 * Cada caso es cómo se ve el punto `(s, t)` de los bytes guardados, con
 * `(X, Y)` la esquina del destino y `w × h` su tamaño girado:
 *
 * ```text
 * 1  tal cual            (X + s,     Y + t)
 * 2  espejo horizontal   (X + w − s, Y + t)
 * 3  media vuelta        (X + w − s, Y + h − t)
 * 4  espejo vertical     (X + s,     Y + h − t)
 * 5  traspuesta          (X + t,     Y + s)
 * 6  cuarto a la derecha (X + w − t, Y + s)
 * 7  transversa          (X + w − t, Y + h − s)
 * 8  cuarto a la izq.    (X + t,     Y + h − s)
 * ```
 */
export function orientationTransform(
  orientation: number,
  target: Rect,
): {
  readonly drawWidth: number;
  readonly drawHeight: number;
  readonly transform: AffineTransform;
} {
  const { x: X, y: Y, width: w, height: h } = target;
  const swapped = swapsSides(orientation);

  const transform: Record<number, AffineTransform> = {
    1: { a: 1, b: 0, c: 0, d: 1, e: X, f: Y },
    2: { a: -1, b: 0, c: 0, d: 1, e: X + w, f: Y },
    3: { a: -1, b: 0, c: 0, d: -1, e: X + w, f: Y + h },
    4: { a: 1, b: 0, c: 0, d: -1, e: X, f: Y + h },
    5: { a: 0, b: 1, c: 1, d: 0, e: X, f: Y },
    6: { a: 0, b: 1, c: -1, d: 0, e: X + w, f: Y },
    7: { a: 0, b: -1, c: -1, d: 0, e: X + w, f: Y + h },
    8: { a: 0, b: -1, c: 1, d: 0, e: X, f: Y + h },
  };

  return {
    // Los bytes guardados tienen los lados cambiados en un cuarto de vuelta.
    drawWidth: swapped ? h : w,
    drawHeight: swapped ? w : h,
    transform: transform[orientation] ?? transform[1],
  };
}

export function applyTransform(
  transform: AffineTransform,
  point: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  return {
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
  };
}
