/**
 * Cómo se leen los números de este producto.
 *
 * En un sitio y no en cada componente: las unidades son físicas y una
 * plantilla mal leída cuesta papel.
 */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} kB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Milímetros, que es la unidad del dominio, con centímetros de apoyo. */
export function formatMillimeters(value: number): string {
  return `${Math.round(value)} mm`;
}

/**
 * Superficie de papel en metros cuadrados.
 *
 * El dominio la da en milímetros cuadrados, que no le dicen nada a nadie:
 * 2 100 000 mm² son 2,10 m², y eso sí se entiende antes de imprimir.
 */
export function formatSquareMillimeters(value: number): string {
  return `${(value / 1_000_000).toFixed(2)} m²`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
