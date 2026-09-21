import { exportPoster } from "@/application/export-poster";
import { InvalidPosterSizeError } from "@/modules/posters/errors";
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
 * La petición dice qué imagen, qué lado y en qué papel. Todo lo demás —la
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
