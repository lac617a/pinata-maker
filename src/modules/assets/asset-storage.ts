/**
 * Almacenamiento de archivos.
 *
 * Aparte del repositorio a propósito: la fila de la base de datos y el
 * archivo son dos cosas distintas que pueden fallar por separado, y quien
 * orquesta necesita poder deshacer una si falla la otra.
 * Ver docs/storage.md §4 y §6.
 */
export type StoredFile = {
  readonly key: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
};

export interface AssetStorage {
  put(file: StoredFile): Promise<void>;

  remove(key: string): Promise<void>;

  /**
   * URL temporal para que el navegador muestre el archivo.
   *
   * Temporal y no pública: los archivos de un usuario no deben quedar
   * accesibles a quien adivine la ruta. Ver docs/PRD.md §26.
   */
  createSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

/** Diez minutos bastan para mostrar una imagen y no para compartirla. */
export const SIGNED_URL_TTL_SECONDS = 600;
