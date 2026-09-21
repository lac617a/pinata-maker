import { exportPoster } from "@/application/export-poster";
import type { ImageCrop } from "@/modules/posters/crop";
import {
  InvalidImageCropError,
  InvalidPosterSizeError,
} from "@/modules/posters/errors";
import type { PosterSizeRequest } from "@/modules/posters/poster";
import type { ProjectId } from "@/modules/projects/project";

import {
  jsonResponse,
  toErrorResponse,
  unauthorizedResponse,
} from "./error-response";
import {
  asPrintConfiguration,
  type ExportRequestContext,
  readJsonBody,
  toPayload,
} from "./export-endpoints";

/**
 * Genera el póster de una imagen del proyecto (docs/PRD.md §44).
 *
 * La petición dice qué imagen, qué parte de ella, qué lado y en qué papel. Todo lo demás —la
 * proporción, el reparto en hojas— lo decide el servidor con lo guardado.
 */
export async function handleExportPoster(
  request: Request,
  projectId: ProjectId,
  context: ExportRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);

    const generated = await exportPoster(context.services, {
      projectId,
      userId: context.userId,
      assetId: asAssetId(body.assetId),
      size: asSize(body),
      crop: asCrop(body.crop),
      print: asPrintConfiguration(body.paper),
    });

    return jsonResponse({ export: toPayload(generated) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

function asAssetId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidPosterSizeError(
      "The request must say which image to print.",
    );
  }

  return value;
}

/**
 * Un lado, y solo uno.
 *
 * Pedir los dos obligaría a elegir cuál manda o a deformar la figura; es
 * mejor que la petición lo diga. Ver docs/PRD.md §44.
 */
function asSize(body: Record<string, unknown>): PosterSizeRequest {
  const width = body.width;
  const height = body.height;

  if (typeof width === "number" && height === undefined) {
    return { width };
  }

  if (typeof height === "number" && width === undefined) {
    return { height };
  }

  throw new InvalidPosterSizeError(
    "The request must give either the width or the height, in millimetres.",
  );
}

/**
 * El recorte es opcional: sin él, la imagen entera. Si viene, que sean
 * números; si caen dentro de la imagen lo decide el caso de uso, que es el
 * que conoce su tamaño.
 */
function asCrop(value: unknown): ImageCrop | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const crop = value as Record<string, unknown>;
  const { x, y, width, height } = crop;

  if (
    typeof value !== "object" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    throw new InvalidImageCropError(
      "A crop must give x, y, width and height, in pixels.",
    );
  }

  return { x, y, width, height };
}
