/**
 * Errores de los archivos generados de un proyecto.
 *
 * Ver docs/PRD.md §23: la interfaz necesita distinguirlos para decir algo
 * útil.
 */

/** El export no cumple una invariante del dominio. */
export class InvalidExportError extends Error {
  readonly code = "INVALID_EXPORT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidExportError";
  }
}

/** El export no existe, o su proyecto no es de quien pregunta. */
export class ExportNotFoundError extends Error {
  readonly code = "EXPORT_NOT_FOUND";

  constructor(message: string) {
    super(message);
    this.name = "ExportNotFoundError";
  }
}

/** Falló guardar o recuperar la fila del export. Ver docs/storage.md §77. */
export class ExportStorageError extends Error {
  readonly code = "EXPORT_STORAGE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExportStorageError";
  }
}
