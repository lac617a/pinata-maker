import type { ProjectId } from "@/modules/projects/project";

import { InvalidAssetError } from "./errors";

export type AssetId = string;

/**
 * Qué representa el archivo.
 *
 * El MVP solo guarda el original que sube el usuario. `storage.md` §38
 * enumera otros tipos, pero nada los produce todavía: `PROCESSED_IMAGE`
 * llegará con la eliminación de fondo y `PDF` con la entrega del documento.
 * Ver docs/AGENTS.md §7.
 */
export type AssetKind = "ORIGINAL_IMAGE";

/**
 * Archivo que pertenece a un proyecto.
 *
 * El original es **inmutable**: volver a procesar la imagen produce un asset
 * nuevo, nunca sobrescribe este. Ver docs/storage.md §46 y §47, y
 * docs/AGENTS.md §19.
 */
export type Asset = {
  readonly id: AssetId;
  readonly projectId: ProjectId;
  readonly kind: AssetKind;
  /**
   * Dónde vive el archivo.
   *
   * La aplicación usa `id`; solo la infraestructura necesita la ruta.
   * Ver docs/storage.md §39 y §40.
   */
  readonly storageKey: string;
  readonly mimeType: string;
  readonly byteSize: number;
  /**
   * Nombre con el que el usuario lo subió.
   *
   * Es metadato para enseñárselo, nunca parte de la ruta.
   * Ver docs/storage.md §42.
   */
  readonly originalName: string;
  readonly createdAt: Date;
};

/**
 * Extensión que corresponde a cada formato.
 *
 * Se deriva del MIME ya validado y no del nombre que puso el usuario: el
 * nombre lo elige él y puede decir cualquier cosa.
 * Ver docs/storage.md §44.
 */
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Ruta del archivo dentro del almacenamiento.
 *
 * Determinista y organizada por proyecto, de modo que borrar un proyecto sea
 * borrar una carpeta y que dos archivos nunca colisionen.
 * Ver docs/storage.md §41.
 */
export function assetStorageKey(input: {
  projectId: ProjectId;
  assetId: AssetId;
  mimeType: string;
}): string {
  const extension = EXTENSIONS[input.mimeType];

  if (!extension) {
    throw new InvalidAssetError(
      `There is no storage extension for ${input.mimeType}.`,
    );
  }

  return `projects/${input.projectId}/assets/${input.assetId}/original.${extension}`;
}

export type CreateAssetInput = {
  readonly id: AssetId;
  readonly projectId: ProjectId;
  readonly kind: AssetKind;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly originalName: string;
  readonly now: Date;
};

export function createAsset(input: CreateAssetInput): Asset {
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new InvalidAssetError(
      `An asset must have a size greater than 0 bytes, received ${input.byteSize}.`,
    );
  }

  if (input.id.trim().length === 0 || input.projectId.trim().length === 0) {
    throw new InvalidAssetError("An asset needs an id and a project.");
  }

  return {
    id: input.id,
    projectId: input.projectId,
    kind: input.kind,
    storageKey: assetStorageKey({
      projectId: input.projectId,
      assetId: input.id,
      mimeType: input.mimeType,
    }),
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    originalName: input.originalName.trim().slice(0, 255),
    createdAt: input.now,
  };
}
