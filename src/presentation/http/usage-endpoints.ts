import { readUsage, type UsageServices } from "@/application/daily-usage";
import {
  generateUnsavedPoster,
  type UnsavedPosterServices,
} from "@/application/generate-unsaved-poster";
import { InvalidPosterSizeError } from "@/modules/posters/errors";
import type { UsageSubject } from "@/modules/usage/usage-subject";

import { readImageFile } from "./asset-endpoints";
import { jsonResponse, toErrorResponse } from "./error-response";
import { asCrop, asPosterPrint, asSize } from "./poster-endpoints";
import { toUsagePayload } from "./usage-payload";

/**
 * Lo que necesita una petición que cuenta uso.
 *
 * `subject` lo resuelve la capa de Next —sesión, cookie, IP y secreto—
 * porque todo eso vive en la petición. Aquí solo se usa.
 */
export type UsageRequestContext = {
  readonly services: UnsavedPosterServices & UsageServices;
  readonly subject: () => UsageSubject;
};

/** Campo del formulario con las opciones del póster, en JSON. */
export const POSTER_OPTIONS_FIELD = "options";

/**
 * Cuánto le queda hoy a quien pregunta, con cuenta o sin ella.
 *
 * La interfaz lo enseña antes de que el usuario invierta trabajo
 * (PRD §39).
 */
export async function handleReadUsage(
  context: UsageRequestContext,
): Promise<Response> {
  try {
    const usage = await readUsage(context.services, context.subject());

    return jsonResponse({ usage: toUsagePayload(usage) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * El póster sin guardar nada: imagen y opciones entran, el PDF sale.
 *
 * Es el camino del visitante sin cuenta (PRD §38), y sirve igual a quien
 * tiene cuenta y no quiere crear un proyecto: entonces cuenta en su cupo.
 *
 * Formulario `multipart`: la imagen en `image` y en `options` un JSON con
 * `width` o `height` en mm, `crop` opcional y `paper` opcional.
 */
export async function handleUnsavedPoster(
  request: Request,
  context: UsageRequestContext,
): Promise<Response> {
  try {
    const file = await readImageFile(request.clone());
    const options = await readOptions(request);

    const { document, usage } = await generateUnsavedPoster(context.services, {
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      size: asSize(options),
      crop: asCrop(options.crop),
      print: asPosterPrint(options),
      subject: context.subject(),
    });

    // Copia con su propio `ArrayBuffer`: es lo que acepta `Response`.
    return new Response(new Uint8Array(document.bytes), {
      status: 200,
      headers: {
        "content-type": document.contentType,
        "content-disposition": attachment(document.fileName),
        // Un documento de un visitante no se guarda en ninguna caché.
        "cache-control": "no-store",
        "x-usage-limit": String(usage.limit),
        "x-usage-remaining": String(usage.remaining),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function readOptions(request: Request): Promise<Record<string, unknown>> {
  const form = await request.formData().catch(() => null);
  const raw = form?.get(POSTER_OPTIONS_FIELD);

  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : null;

    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Cae al error de abajo: la petición no dice qué tamaño quiere.
  }

  throw new InvalidPosterSizeError(
    `The request must carry the poster options as JSON in "${POSTER_OPTIONS_FIELD}".`,
  );
}

/**
 * Descarga con el nombre del archivo, también con tildes.
 *
 * `filename` lleva una versión solo ASCII para los clientes viejos;
 * `filename*` la de verdad, codificada (RFC 6266).
 */
function attachment(fileName: string): string {
  const ascii = fileName
    .normalize("NFD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/"/g, "");

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
