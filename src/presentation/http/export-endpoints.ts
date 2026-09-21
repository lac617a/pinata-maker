import {
  deleteProjectExport,
  downloadExport,
  exportTemplateVersion,
  listProjectExports,
  type ExportServices,
} from "../../application/export-printable-document";
import type { ExportId, ProjectExport } from "../../modules/exports/export";
import { InvalidExportError } from "../../modules/exports/errors";
import {
  PAPER_FORMATS,
  type PaperFormat,
  type PaperOrientation,
} from "../../modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "../../modules/printing/print-layout";
import type { ProjectId, UserId } from "../../modules/projects/project";
import {
  jsonResponse,
  toErrorResponse,
  unauthorizedResponse,
} from "./error-response";

export type ExportRequestContext = {
  readonly services: ExportServices;
  readonly userId: UserId | null;
};

/**
 * Genera el PDF de una versión de plantilla.
 *
 * La petición dice **qué versión** exportar, no qué geometría: el molde ya
 * está guardado y el servidor lo lee de ahí. Es la diferencia entre entregar
 * un documento reproducible y uno que depende de lo que mande el cliente.
 */
export async function handleExportTemplateVersion(
  request: Request,
  projectId: ProjectId,
  context: ExportRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);

    const generated = await exportTemplateVersion(context.services, {
      projectId,
      userId: context.userId,
      templateVersionId: asTemplateVersionId(body.templateVersionId),
      print: asPrintConfiguration(body.paper),
    });

    return jsonResponse({ export: toPayload(generated) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleListProjectExports(
  projectId: ProjectId,
  context: ExportRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const generated = await listProjectExports(
      context.services,
      projectId,
      context.userId,
    );

    return jsonResponse({ exports: generated.map(toPayload) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Entrega el enlace de descarga de un documento.
 *
 * Devuelve una URL firmada y no el archivo: un PDF de cincuenta hojas no
 * debería atravesar el proceso que atiende las peticiones cada vez que
 * alguien lo descarga. Ver docs/PRD.md §26.
 */
export async function handleDownloadExport(
  exportId: ExportId,
  context: ExportRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const downloadable = await downloadExport(
      context.services,
      exportId,
      context.userId,
    );

    return jsonResponse(
      { export: { ...toPayload(downloadable.export), url: downloadable.url } },
      200,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleDeleteExport(
  exportId: ExportId,
  context: ExportRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    await deleteProjectExport(context.services, exportId, context.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Representación del export que sale por la API.
 *
 * La ruta de almacenamiento no sale: es detalle de infraestructura y
 * conocerla no le sirve de nada a quien consume la API.
 */
function toPayload(generated: ProjectExport) {
  return {
    id: generated.id,
    projectId: generated.projectId,
    templateVersionId: generated.templateVersionId,
    fileName: generated.fileName,
    contentType: generated.contentType,
    pageCount: generated.pageCount,
    byteSize: generated.byteSize,
    paperFormat: generated.paperFormat,
    paperOrientation: generated.paperOrientation,
    generatorVersion: generated.generatorVersion,
    createdAt: generated.createdAt.toISOString(),
  };
}

/** Un cuerpo que no es JSON es un error del cliente, no una excepción. */
async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asTemplateVersionId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidExportError(
      "The request must say which template version to export.",
    );
  }

  return value;
}

/**
 * Papel pedido por el cliente, si pidió alguno.
 *
 * Solo se acepta el formato y la orientación. Los márgenes y el solape
 * siguen siendo los del producto: son decisiones físicas ya tomadas
 * (`printing.md` §45) y no algo que cada petición deba poder alterar.
 */
function asPrintConfiguration(value: unknown): PrintConfiguration | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidExportError("paper must be an object.");
  }

  const paper = value as { format?: unknown; orientation?: unknown };

  const format = PAPER_FORMATS.find(
    (candidate) => candidate === paper.format,
  ) as PaperFormat | undefined;

  if (!format) {
    throw new InvalidExportError(
      `paper.format must be one of ${PAPER_FORMATS.join(", ")}.`,
    );
  }

  if (paper.orientation !== "PORTRAIT" && paper.orientation !== "LANDSCAPE") {
    throw new InvalidExportError(
      "paper.orientation must be PORTRAIT or LANDSCAPE.",
    );
  }

  const orientation: PaperOrientation = paper.orientation;

  return {
    ...DEFAULT_PRINT_CONFIGURATION,
    paper: {
      ...DEFAULT_PRINT_CONFIGURATION.paper,
      format,
      orientation,
    },
  };
}
