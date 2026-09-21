import type { AssetRepository } from "@/modules/assets/asset-repository";
import { ExportNotFoundError } from "@/modules/exports/errors";
import {
  createProjectExport,
  type ExportId,
  type ProjectExport,
} from "@/modules/exports/export";
import type { ExportRepository } from "@/modules/exports/export-repository";
import {
  type EmbeddedImage,
  type EmbeddedImageFormat,
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
import type { Template } from "@/modules/templates/template";
import type { TemplateVersionId } from "@/modules/templates/template-version";

import { generatePrintableDocument } from "./generate-printable-document";
import { openProject } from "./manage-projects";
import {
  openTemplateVersion,
  type TemplateVersionServices,
} from "./manage-template-versions";

export type ExportServices = TemplateVersionServices & {
  readonly exports: ExportRepository;
  /** Para encontrar la imagen de la que salió la versión. */
  readonly assets: AssetRepository;
  /** Bucket de las imágenes, de donde se leen sus bytes. */
  readonly assetStorage: ObjectStorage;
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
    referenceImage: await loadReferenceImage(
      services,
      version.sourceAssetId,
      template,
      input.userId,
    ),
    renderer: services.renderer,
    print: configuration,
    fileName: `${template.name}-v${version.versionNumber}.pdf`,
    creationDate: services.now(),
  });

  const generated = createProjectExport({
    id: services.newExportId(),
    projectId: version.projectId,
    templateVersionId: version.id,
    width: template.width,
    height: template.height,
    fileName: document.fileName,
    contentType: document.contentType,
    pageCount: document.pageCount,
    byteSize: document.bytes.byteLength,
    paperFormat: configuration.paper.format,
    paperOrientation: configuration.paper.orientation,
    generatorVersion: PDF_GENERATOR_VERSION,
    now: services.now(),
  });

  return storeGeneratedDocument(
    services,
    generated,
    document.bytes,
    input.userId,
  );
}

/**
 * Guarda un documento ya generado: primero el archivo, después la fila.
 *
 * Si falla la fila se borra el archivo: sin eso quedaría un documento que
 * nadie referencia, ocupando espacio para siempre. Mismo orden que en la
 * subida de imágenes. Ver docs/storage.md §148.
 */
export async function storeGeneratedDocument(
  services: ExportServices,
  generated: ProjectExport,
  bytes: Uint8Array,
  userId: UserId,
): Promise<ProjectExport> {
  await services.exportStorage.put({
    key: generated.storageKey,
    contentType: generated.contentType,
    bytes,
  });

  try {
    await services.exports.create(generated, userId);
  } catch (error) {
    await services.exportStorage
      .remove(generated.storageKey)
      .catch(() => undefined);

    throw error;
  }

  return generated;
}

/**
 * Los bytes de la imagen de la que salió la versión, si se puede dibujar.
 *
 * Una versión sin imagen de origen, o una plantilla que no dice dónde va,
 * produce el documento con los contornos. Lo mismo si el usuario borró la
 * imagen: la clave foránea queda a `null` y el molde sigue siendo válido
 * (docs/storage.md §157). Lo que **no** se ignora es un fallo leyendo el
 * archivo: entregar sin avisar un documento distinto del que se pidió sería
 * peor que pedir que se reintente.
 */
async function loadReferenceImage(
  services: ExportServices,
  sourceAssetId: string | null,
  template: Template,
  userId: UserId,
): Promise<EmbeddedImage | undefined> {
  if (!sourceAssetId || !template.referenceImage) {
    return undefined;
  }

  const asset = await services.assets.findById(sourceAssetId, userId);

  if (!asset) {
    return undefined;
  }

  const format = EMBEDDED_FORMATS[asset.mimeType];

  if (!format) {
    return undefined;
  }

  return {
    bytes: await services.assetStorage.get(asset.storageKey),
    format,
  };
}

const EMBEDDED_FORMATS: Record<string, EmbeddedImageFormat> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WEBP",
};

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
    // Un enlace que descarga, no que abre: el usuario se queda en la página
    // y el archivo llega con el nombre de la plantilla y su versión.
    url: await services.exportStorage.createSignedUrl(
      found.storageKey,
      SIGNED_URL_TTL_SECONDS,
      { downloadAs: found.fileName },
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
