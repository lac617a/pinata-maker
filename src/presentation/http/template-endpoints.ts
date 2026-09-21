import {
  listTemplateVersions,
  openTemplateVersion,
  publishTemplateVersion,
  type TemplateVersionServices,
} from "@/application/manage-template-versions";
import type { ProjectId, UserId } from "@/modules/projects/project";
import { InvalidTemplateDefinitionError } from "@/modules/templates/errors";
import { deserializeTemplate } from "@/modules/templates/template-definition";
import type {
  TemplateVersion,
  TemplateVersionId,
  TemplateVersionSummary,
} from "@/modules/templates/template-version";

import {
  jsonResponse,
  toErrorResponse,
  unauthorizedResponse,
} from "./error-response";

export type TemplateRequestContext = {
  readonly services: TemplateVersionServices;
  readonly userId: UserId | null;
};

/**
 * Publica una versión de la plantilla del proyecto.
 *
 * El cuerpo trae la plantilla ya derivada, que es el estado editable del que
 * habla `storage.md` §18: el trabajo en curso vive fuera y publicar lo fija.
 * Cuando exista la eliminación de fondo, el propio servidor derivará la
 * plantilla y llamará al mismo caso de uso; esta ruta seguirá siendo la que
 * usa el editor para publicar su borrador.
 *
 * Lo que llega **no se guarda tal cual**: `deserializeTemplate` lo reconstruye
 * con los constructores del dominio, así que lo único que puede almacenarse
 * es geometría que el dominio acepta y que cabe en los límites del formato.
 */
export async function handlePublishTemplateVersion(
  request: Request,
  projectId: ProjectId,
  context: TemplateRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);

    const version = await publishTemplateVersion(context.services, {
      projectId,
      userId: context.userId,
      template: deserializeTemplate(body.template),
      sourceAssetId: asOptionalText(body.sourceAssetId),
      expectedVersionNumber: asOptionalVersionNumber(
        body.expectedVersionNumber,
      ),
    });

    return jsonResponse({ version: toSummaryPayload(version) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleListTemplateVersions(
  projectId: ProjectId,
  context: TemplateRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const versions = await listTemplateVersions(
      context.services,
      projectId,
      context.userId,
    );

    return jsonResponse({ versions: versions.map(toSummaryPayload) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Devuelve una versión con su geometría.
 *
 * Es la única respuesta que lleva la definición completa: en un listado sería
 * un documento de cientos de kilobytes por fila.
 */
export async function handleGetTemplateVersion(
  versionId: TemplateVersionId,
  context: TemplateRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const { version } = await openTemplateVersion(
      context.services,
      versionId,
      context.userId,
    );

    return jsonResponse(
      {
        version: { ...toSummaryPayload(version), template: version.definition },
      },
      200,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toSummaryPayload(version: TemplateVersionSummary | TemplateVersion) {
  return {
    id: version.id,
    projectId: version.projectId,
    versionNumber: version.versionNumber,
    name: version.name,
    width: version.width,
    height: version.height,
    depth: version.depth,
    pieceCount: version.pieceCount,
    derivationVersion: version.derivationVersion,
    schemaVersion: version.schemaVersion,
    sourceAssetId: version.sourceAssetId,
    createdAt: version.createdAt.toISOString(),
  };
}

/** Un cuerpo que no es JSON es un error del cliente, no una excepción. */
async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Validación de entrada, no de dominio.
 *
 * Un `expectedVersionNumber` que no es un número entero no es «ninguno»: es
 * una petición mal formada, y tratarla como ausente publicaría encima de un
 * estado que el cliente no conoce. Ver docs/storage.md §21.
 */
function asOptionalVersionNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new InvalidTemplateDefinitionError(
      "expectedVersionNumber must be a whole number of zero or more.",
    );
  }

  return value as number;
}
