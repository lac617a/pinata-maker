import { AssetStorageError } from "./errors";
import type { AssetStorage, StoredFile } from "./asset-storage";

/**
 * Almacenamiento de referencia, en memoria.
 *
 * Permite probar la subida sin object storage, igual que el repositorio en
 * memoria permite probarla sin base de datos.
 */
export class InMemoryAssetStorage implements AssetStorage {
  private readonly files = new Map<string, StoredFile>();

  async put(file: StoredFile): Promise<void> {
    this.files.set(file.key, {
      ...file,
      bytes: Uint8Array.from(file.bytes),
    });
  }

  async remove(key: string): Promise<void> {
    this.files.delete(key);
  }

  async createSignedUrl(key: string): Promise<string> {
    if (!this.files.has(key)) {
      throw new AssetStorageError(`There is no file stored at ${key}.`);
    }

    return `memory://${key}`;
  }

  /** Solo para las pruebas: qué hay guardado de verdad. */
  keys(): string[] {
    return [...this.files.keys()];
  }
}
