import { ExportNotFoundError } from "@/modules/exports/errors";
import {
  createProjectExport,
  type ExportId,
  type ProjectExport,
} from "@/modules/exports/export";
import type { ExportRepository } from "@/modules/exports/export-repository";
import {
  PDF_GENERATOR_VERSION,
  type PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";
import type { ProjectId, UserId } from "@/modules/projects/project";
import {
  type ObjectStorage,
  SIGNED_URL_TTL_SECONDS,
} from "@/modules/storage/object-storage";
import { TemplateVersionNotFoundError } from "@/modules/templates/errors";
import type { TemplateVersionId } from "@/modules/templates/template-version";

import { generatePrintableDocument } from "./generate-printable-document";
import { openProject } from "./manage-projects";
import {
  openTemplateVersion,
  type TemplateVersionServices,
} from "./manage-template-versions";

export type ExportServices = TemplateVersionServices & {
  readonly exports: ExportRepository;
  /** Bucket de los documentos, distinto del de las imágenes. */
  readonly exportStorage: ObjectStorage;
  /** La implementación concreta la decide quien monta el contexto. */
  readonly renderer: PrintRenderer;
  readonly newExportId: () => ExportId;
};

export type ExportTemplateVersionInput = {
  readonly templateVersionId: TemplateVersionId;
  readonly userId: UserId;
  /**
   * Proyecto desde el que se pide.
   *
   * Cuando llega, la versión tiene que ser suya: una ruta anidada bajo un
   * proyecto no debe poder exportar la versión de otro, aunque los dos sean
   * del mismo usuario.
   */
  readonly projectId?: ProjectId;
  readonly print?: PrintConfiguration;
};

/**
 * Genera el PDF de una versión de plantilla y lo guarda.
 *
 * Es lo que faltaba para AC-13: hasta aquí el documento se producía en
 * memoria y se perdía con la petición.
 *
 * El archivo se guarda entero y no se regenera al descargarlo. Un PDF
 * generado es un artefacto inmutable (docs/storage.md §55): volver a
 * producirlo con una versión distinta del generador daría un documento
 * distinto del que el usuario tiene impreso.
 */
export async function exportTemplateVersion(
  services: ExportServices,
  input: ExportTemplateVersionInput,
): Promise<ProjectExport> {
  const { version, template } = await openTemplateVersion(
    services,
    input.templateVersionId,
    input.userId,
  );

  if (input.projectId && version.projectId !== input.projectId) {
    // Misma respuesta que si no existiera: decir «existe, pero no es de este
    // proyecto» es información que no hace falta dar.
    throw new TemplateVersionNotFoundError(
      `Template version ${input.templateVersionId} is not available.`,
    );
  }

  const configuration = input.print ?? DEFAULT_PRINT_CONFIGURATION;

  const document = await generatePrintableDocument({
    template,
    renderer: services.renderer,
    print: configuration,
    fileName: `${template.name}-v${version.versionNumber}.pdf`,
    creationDate: services.now(),
  });

  const generated = createProjectExport({
    id: services.newExportId(),
    projectId: version.projectId,
    templateVersionId: version.id,
    fileName: document.fileName,
    contentType: document.contentType,
    pageCount: document.pageCount,
    byteSize: document.bytes.byteLength,
    paperFormat: configuration.paper.format,
    paperOrientation: configuration.paper.orientation,
    generatorVersion: PDF_GENERATOR_VERSION,
    now: services.now(),
  });

  await services.exportStorage.put({
    key: generated.storageKey,
    contentType: generated.contentType,
    bytes: document.bytes,
  });

  try {
    await services.exports.create(generated, input.userId);
  } catch (error) {
    // El archivo ya está subido y la fila no. Sin esto quedaría un documento
    // que nadie referencia, ocupando espacio para siempre. Mismo orden que en
    // la subida de imágenes. Ver docs/storage.md §148.
    await services.exportStorage
      .remove(generated.storageKey)
      .catch(() => undefined);

    throw error;
  }

  return generated;
}

export async function listProjectExports(
  services: ExportServices,
  projectId: ProjectId,
  userId: UserId,
): Promise<ProjectExport[]> {
  // El proyecto se abre primero: así un proyecto ajeno responde como
  // inexistente en lugar de devolver una lista vacía.
  await openProject(services, projectId, userId);

  return services.exports.listByProject(projectId, userId);
}

export type DownloadableExport = {
  readonly export: ProjectExport;
  /** URL temporal para descargarlo. Ver docs/PRD.md §26. */
  readonly url: string;
};

/**
 * Entrega un documento ya generado.
 *
 * El PDF no se sirve desde el servidor de la aplicación: se firma un enlace
 * temporal al object storage. Un documento de cincuenta hojas no debería
 * pasar por el proceso que atiende las peticiones cada vez que alguien lo
 * descarga.
 */
export async function downloadExport(
  services: ExportServices,
  exportId: ExportId,
  userId: UserId,
): Promise<DownloadableExport> {
  const found = await services.exports.findById(exportId, userId);

  if (!found) {
    throw new ExportNotFoundError(`Export ${exportId} is not available.`);
  }

  return {
    export: found,
    url: await services.exportStorage.createSignedUrl(
      found.storageKey,
      SIGNED_URL_TTL_SECONDS,
    ),
  };
}

/**
 * Borra un documento generado.
 *
 * Primero la fila y después el archivo, como en las imágenes: un archivo sin
 * fila es desperdicio, una fila sin archivo es una descarga rota.
 */
export async function deleteProjectExport(
  services: ExportServices,
  exportId: ExportId,
  userId: UserId,
): Promise<void> {
  const found = await services.exports.findById(exportId, userId);

  if (!found) {
    throw new ExportNotFoundError(`Export ${exportId} is not available.`);
  }

  await services.exports.delete(exportId, userId);
  await services.exportStorage.remove(found.storageKey);
}
