import type { SupabaseClient } from "@supabase/supabase-js";

import type { AssetStorage, StoredFile } from "../asset-storage";
import { AssetStorageError } from "../errors";

/**
 * Bucket privado de los archivos de proyecto.
 *
 * Lo crea la migración 0002. Privado a propósito: las imágenes se sirven con
 * una URL firmada y caducable, no por una ruta adivinable.
 */
export const PROJECT_ASSETS_BUCKET = "project-assets";

export class SupabaseAssetStorage implements AssetStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string = PROJECT_ASSETS_BUCKET,
  ) {}

  async put(file: StoredFile): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(file.key, file.bytes, {
        contentType: file.contentType,
        // El original es inmutable: una subida nueva es un asset nuevo, así
        // que una clave repetida sería un error, no una sustitución.
        upsert: false,
      });

    if (error) {
      throw new AssetStorageError(`Could not store the file.`, {
        cause: error,
      });
    }
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      throw new AssetStorageError(`Could not remove the file.`, {
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
      throw new AssetStorageError(`Could not create a link for the file.`, {
        cause: error,
      });
    }

    return data.signedUrl;
  }
}
