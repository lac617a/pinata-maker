import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ObjectStorageError,
  type ObjectStorage,
  type StoredFile,
} from "../../modules/storage/object-storage";

/**
 * Bucket de las imágenes que sube el usuario. Lo crea la migración 0002.
 *
 * Privado a propósito: las imágenes se sirven con una URL firmada y caducable,
 * no por una ruta adivinable.
 */
export const PROJECT_ASSETS_BUCKET = "project-assets";

/** Bucket de los PDF generados. Lo crea la migración 0004. */
export const PROJECT_EXPORTS_BUCKET = "project-exports";

/**
 * Object storage sobre Supabase Storage.
 *
 * Un solo adaptador para los dos buckets: lo que cambia es dónde se guarda,
 * no cómo. Ver docs/storage.md §160.
 */
export class SupabaseObjectStorage implements ObjectStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async put(file: StoredFile): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(file.key, file.bytes, {
        contentType: file.contentType,
        // Lo que se guarda es inmutable: una subida nueva es un archivo
        // nuevo, así que una clave repetida es un error y no una
        // sustitución silenciosa. Ver docs/storage.md §47 y §55.
        upsert: false,
      });

    if (error) {
      throw new ObjectStorageError("Could not store the file.", {
        cause: error,
      });
    }
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);

    if (error) {
      throw new ObjectStorageError("Could not remove the file.", {
        cause: error,
      });
    }
  }

  async createSignedUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);

    if (error || !data) {
      throw new ObjectStorageError("Could not create a link for the file.", {
        cause: error,
      });
    }

    return data.signedUrl;
  }
}
