/**
 * Errores de los archivos de un proyecto.
 *
 * Ver docs/PRD.md §23: la interfaz necesita distinguirlos para decir algo
 * útil.
 */

/** El asset no cumple una invariante del dominio. */
export class InvalidAssetError extends Error {
  readonly code = "INVALID_ASSET";

  constructor(message: string) {
    super(message);
    this.name = "InvalidAssetError";
  }
}

/** El asset no existe, o su proyecto no es de quien pregunta. */
export class AssetNotFoundError extends Error {
  readonly code = "ASSET_NOT_FOUND";

  constructor(message: string) {
    super(message);
    this.name = "AssetNotFoundError";
  }
}

/**
 * Falló guardar o recuperar la fila del asset.
 *
 * El archivo tiene el suyo, `ObjectStorageError`: la fila y el archivo son
 * dos almacenamientos distintos y fallan por separado.
 * Ver docs/storage.md §77 y §148.
 */
export class AssetStorageError extends Error {
  readonly code = "ASSET_STORAGE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AssetStorageError";
  }
}
