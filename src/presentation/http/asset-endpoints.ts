import {
  type AssetServices,
  deleteProjectImage,
  listProjectImages,
  uploadProjectImage,
  type ViewableAsset,
} from "@/application/upload-project-image";
import type { AssetId } from "@/modules/assets/asset";
import { InvalidAssetError } from "@/modules/assets/errors";
import { IMAGE_LIMITS } from "@/modules/image-processing/image-validation";
import type { ProjectId, UserId } from "@/modules/projects/project";

import {
  jsonResponse,
  toErrorResponse,
  unauthorizedResponse,
} from "./error-response";

export type AssetRequestContext = {
  readonly services: AssetServices;
  readonly userId: UserId | null;
};

/** Nombre del campo del formulario que trae el archivo. */
export const IMAGE_FIELD = "image";

export async function handleUploadProjectImage(
  request: Request,
  projectId: ProjectId,
  context: AssetRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const file = await readImageFile(request);

    const asset = await uploadProjectImage(context.services, {
      projectId,
      userId: context.userId,
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    return jsonResponse({ asset: toPayload(asset) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleListProjectImages(
  projectId: ProjectId,
  context: AssetRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const images = await listProjectImages(
      context.services,
      projectId,
      context.userId,
    );

    return jsonResponse({ images: images.map(toViewablePayload) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleDeleteProjectImage(
  assetId: AssetId,
  context: AssetRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    await deleteProjectImage(context.services, assetId, context.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Saca el archivo del formulario.
 *
 * Se comprueba el tamaño antes de leer los bytes: cargar en memoria un
 * archivo enorme para después rechazarlo es justo lo que un atacante
 * buscaría. Ver docs/AGENTS.md §46.
 */
async function readImageFile(request: Request): Promise<File> {
  const form = await request.formData().catch(() => null);
  const file = form?.get(IMAGE_FIELD);

  if (!(file instanceof File)) {
    throw new InvalidAssetError(
      `The request must carry a file in the "${IMAGE_FIELD}" field.`,
    );
  }

  if (file.size > IMAGE_LIMITS.maxFileBytes) {
    throw new InvalidAssetError(
      `The image weighs ${file.size} bytes, above the limit of ${IMAGE_LIMITS.maxFileBytes}.`,
    );
  }

  return file;
}

function toPayload(asset: {
  id: string;
  kind: string;
  mimeType: string;
  byteSize: number;
  originalName: string;
  createdAt: Date;
}) {
  // La ruta de almacenamiento no sale: es detalle de infraestructura y
  // conocerla no le sirve de nada a quien consume la API.
  return {
    id: asset.id,
    kind: asset.kind,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    originalName: asset.originalName,
    createdAt: asset.createdAt.toISOString(),
  };
}

function toViewablePayload(viewable: ViewableAsset) {
  return { ...toPayload(viewable.asset), url: viewable.url };
}
