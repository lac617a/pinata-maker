/**
 * Unidad física oficial del dominio.
 *
 * Un valor tipado como `Millimeters` representa SIEMPRE milímetros: nunca
 * pixels de imagen, pixels de pantalla ni puntos PDF. Las conversiones desde y
 * hacia otras unidades ocurren exclusivamente en los boundaries
 * (procesamiento de imagen, rendering y generación de PDF).
 *
 * Ver docs/geometry.md §4 y §92.
 */
export type Millimeters = number;

/**
 * Tolerancia geométrica centralizada.
 *
 * Las magnitudes físicas derivadas de cálculos en punto flotante no deben
 * compararse con `===`. Existe un único valor para evitar que distintas
 * tolerancias se dispersen por el código.
 *
 * Ver docs/geometry.md §35.
 */
export const GEOMETRY_TOLERANCE_MM: Millimeters = 0.001;

/**
 * Una coordenada física válida debe ser finita: NaN, Infinity y -Infinity
 * no representan una posición medible. Ver docs/geometry.md §8.
 */
export function isFiniteMillimeters(value: number): value is Millimeters {
  return Number.isFinite(value);
}

/** Comparación de magnitudes físicas con tolerancia. Ver docs/geometry.md §36. */
export function millimetersEqual(
  a: Millimeters,
  b: Millimeters,
  tolerance: Millimeters = GEOMETRY_TOLERANCE_MM,
): boolean {
  return Math.abs(a - b) <= tolerance;
}
