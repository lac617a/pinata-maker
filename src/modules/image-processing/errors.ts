/**
 * Errores del procesamiento de imagen.
 *
 * Un contorno inválido es un resultado clasificable del proceso, no un fallo
 * genérico: la UI necesita distinguirlo para explicarle al usuario que la
 * imagen no produjo una figura utilizable. Ver docs/image-processing.md §77.
 */
export class InvalidContourError extends Error {
  readonly code = "INVALID_CONTOUR";

  constructor(message: string) {
    super(message);
    this.name = "InvalidContourError";
  }
}
