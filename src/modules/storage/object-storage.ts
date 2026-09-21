/**
 * Almacenamiento de archivos.
 *
 * Aparte de los repositorios a propósito: la fila de la base de datos y el
 * archivo son dos cosas distintas que pueden fallar por separado, y quien
 * orquesta necesita poder deshacer una si falla la otra.
 * Ver docs/storage.md §4 y §6.
 *
 * El puerto es uno solo porque los dos archivos que el sistema guarda —la
 * imagen original y el PDF exportado— necesitan exactamente lo mismo: subir,
 * borrar y firmar un enlace temporal. Lo que cambia entre ellos es el bucket,
 * y eso lo decide el adaptador. Ver docs/storage.md §128 y §160.
 */
export type StoredFile = {
  readonly key: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
};

export interface ObjectStorage {
  put(file: StoredFile): Promise<void>;

  remove(key: string): Promise<void>;

  /**
   * URL temporal para que el navegador reciba el archivo.
   *
   * Temporal y no pública: los archivos de un usuario no deben quedar
   * accesibles a quien adivine la ruta. Ver docs/PRD.md §26.
   */
  createSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

/** Diez minutos bastan para mostrar o descargar y no para repartir. */
export const SIGNED_URL_TTL_SECONDS = 600;

/** Falló guardar, borrar o firmar un archivo. Ver docs/storage.md §77. */
export class ObjectStorageError extends Error {
  readonly code = "OBJECT_STORAGE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ObjectStorageError";
  }
}
