/**
 * Errores de la generación de documentos imprimibles.
 *
 * Son errores del boundary de salida, no del dominio: describen por qué no se
 * pudo representar un `PrintLayout`, nunca una regla física incorrecta. Los
 * fallos de la librería de PDF se traducen a estos tipos para que no escapen
 * al resto del sistema. Ver docs/pdf.md §42 y §43.
 */

/** La librería de PDF falló al construir o serializar el documento. */
export class PdfRenderError extends Error {
  readonly code = "PDF_RENDER_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PdfRenderError";
  }
}

/**
 * El layout contiene valores que no pueden entregarse a la librería.
 *
 * El renderer valida antes de dibujar en lugar de confiar en el layout: una
 * coordenada no finita produciría un PDF corrupto o silenciosamente
 * deformado. Ver docs/pdf.md §73.
 */
export class InvalidPdfGeometryError extends Error {
  readonly code = "PDF_INVALID_GEOMETRY";

  constructor(message: string) {
    super(message);
    this.name = "InvalidPdfGeometryError";
  }
}

/**
 * El layout pide algo que el renderer no sabe representar.
 *
 * Fallar es obligatorio: aproximar la plantilla cambiaría sus dimensiones
 * físicas sin que el usuario lo sepa. Ver docs/pdf.md §44 y §75.
 */
export class UnsupportedPdfFeatureError extends Error {
  readonly code = "PDF_UNSUPPORTED_FEATURE";

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedPdfFeatureError";
  }
}

/**
 * El documento supera los límites de tamaño admitidos.
 *
 * Protege contra un input que provoque consumo ilimitado de memoria o tiempo.
 * Ver docs/pdf.md §74.
 */
export class PdfResourceLimitError extends Error {
  readonly code = "PDF_RESOURCE_LIMIT_EXCEEDED";

  constructor(message: string) {
    super(message);
    this.name = "PdfResourceLimitError";
  }
}
