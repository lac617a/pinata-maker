import {
  type ObjectStorage,
  ObjectStorageError,
  type SignedUrlOptions,
  type StoredFile,
} from "./object-storage";

/**
 * Almacenamiento de referencia, en memoria.
 *
 * Permite probar la subida y la entrega sin object storage, igual que los
 * repositorios en memoria permiten probarlas sin base de datos.
 */
export class InMemoryObjectStorage implements ObjectStorage {
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

  async createSignedUrl(
    key: string,
    _expiresInSeconds?: number,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    if (!this.files.has(key)) {
      throw new ObjectStorageError(`There is no file stored at ${key}.`);
    }

    return options.downloadAs
      ? `memory://${key}?download=${encodeURIComponent(options.downloadAs)}`
      : `memory://${key}`;
  }

  /** Solo para las pruebas: qué hay guardado de verdad. */
  keys(): string[] {
    return [...this.files.keys()];
  }

  /** Solo para las pruebas: qué se guardó exactamente. */
  read(key: string): StoredFile | undefined {
    return this.files.get(key);
  }
}
