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

/** Centímetros con coma decimal: la medida con la que piensa el usuario. */
export function formatCentimeters(millimeters: number): string {
  return (millimeters / 10).toLocaleString("es", {
    maximumFractionDigits: 1,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
