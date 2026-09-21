import { type Asset, type AssetId, createAsset } from "@/modules/assets/asset";
import type { AssetRepository } from "@/modules/assets/asset-repository";
import { AssetNotFoundError } from "@/modules/assets/errors";
import {
  UnsupportedImageFormatError,
  UnsupportedImageOrientationError,
} from "@/modules/image-processing/errors";
import { readImageHeader } from "@/modules/image-processing/image-header";
import {
  validateImageMetadata,
  validateImageUpload,
} from "@/modules/image-processing/image-validation";
import type { ProjectId, UserId } from "@/modules/projects/project";
import {
  type ObjectStorage,
  SIGNED_URL_TTL_SECONDS,
} from "@/modules/storage/object-storage";

import { openProject, type ProjectServices } from "./manage-projects";

export type AssetServices = ProjectServices & {
  readonly assets: AssetRepository;
  readonly storage: ObjectStorage;
  readonly newAssetId: () => AssetId;
};

export type UploadProjectImageInput = {
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly fileName: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
};

/**
 * Guarda la imagen original de un proyecto.
 *
 * El original es inmutable y no se sustituye: subir otra imagen crea un asset
 * nuevo. Ver docs/storage.md §46 y §47.
 *
 * No se comprueban las dimensiones porque eso exige decodificar la imagen, y
 * el decodificador llega con la eliminación de fondo. `validateImageMetadata`
 * existe y se aplicará ahí. Ver docs/roadmap.md §4, fase B.
 */
export async function uploadProjectImage(
  services: AssetServices,
  input: UploadProjectImageInput,
): Promise<Asset> {
  // Abre el proyecto antes de tocar nada: si no es suyo, no se sube.
  await openProject(services, input.projectId, input.userId);

  const mimeType = validateImageUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
  });

  assertContentMatches(mimeType, input.bytes);

  const asset = createAsset({
    id: services.newAssetId(),
    projectId: input.projectId,
    kind: "ORIGINAL_IMAGE",
    mimeType,
    byteSize: input.bytes.byteLength,
    originalName: input.fileName,
    now: services.now(),
  });

  await services.storage.put({
    key: asset.storageKey,
    contentType: asset.mimeType,
    bytes: input.bytes,
  });

  try {
    await services.assets.save(asset, input.userId);
  } catch (error) {
    // El archivo ya está subido y la fila no. Sin esto quedaría un archivo
    // que nadie referencia, ocupando espacio para siempre.
    await services.storage.remove(asset.storageKey).catch(() => undefined);

    throw error;
  }

  return asset;
}

/**
 * Lo que declara el cliente tiene que coincidir con lo que hay en el archivo.
 *
 * El nombre y el tipo los pone quien sube; la cabecera, no
 * (docs/storage.md §44 y §122). Con ella se aplican además los límites de
 * dimensiones, que antes esperaban a un decodificador (docs/storage.md §150).
 */
function assertContentMatches(mimeType: string, bytes: Uint8Array): void {
  const header = readImageHeader(bytes);

  if (header.format !== mimeType) {
    throw new UnsupportedImageFormatError(
      `The file declares ${mimeType} but its content is ${header.format}.`,
    );
  }

  validateImageMetadata({
    mimeType: header.format,
    byteSize: bytes.byteLength,
    width: header.width,
    height: header.height,
  });

  if (header.orientation !== 1) {
    throw new UnsupportedImageOrientationError(
      `The photo carries EXIF orientation ${header.orientation}, which is not applied yet.`,
    );
  }
}

export type ViewableAsset = {
  readonly asset: Asset;
  /** URL temporal para mostrarlo. Ver docs/PRD.md §26. */
  readonly url: string;
};

/**
 * Imágenes de un proyecto, listas para enseñarse.
 *
 * Cada una con una URL temporal: el archivo no es público, así que el
 * navegador necesita permiso explícito y caducable para pedirlo.
 */
export async function listProjectImages(
  services: AssetServices,
  projectId: ProjectId,
  userId: UserId,
): Promise<ViewableAsset[]> {
  await openProject(services, projectId, userId);

  const assets = await services.assets.listByProject(projectId, userId);

  return Promise.all(
    assets.map(async (asset) => ({
      asset,
      url: await services.storage.createSignedUrl(
        asset.storageKey,
        SIGNED_URL_TTL_SECONDS,
      ),
    })),
  );
}

/**
 * Borra una imagen del proyecto.
 *
 * Primero la fila y después el archivo. Si falla lo segundo queda un archivo
 * huérfano, que es desperdicio; al revés quedaría una fila que apunta a nada,
 * que es una imagen rota para el usuario.
 */
export async function deleteProjectImage(
  services: AssetServices,
  assetId: AssetId,
  userId: UserId,
): Promise<void> {
  const asset = await services.assets.findById(assetId, userId);

  if (!asset) {
    throw new AssetNotFoundError(`Asset ${assetId} is not available.`);
  }

  await services.assets.delete(assetId, userId);
  await services.storage.remove(asset.storageKey);
}
