import type { AssetId } from "@/modules/assets/asset";
import { AssetNotFoundError } from "@/modules/assets/errors";
import {
  createProjectExport,
  type ProjectExport,
} from "@/modules/exports/export";
import {
  orientedSize,
  readImageHeader,
} from "@/modules/image-processing/image-header";
import {
  type EmbeddedImageFormat,
  PDF_GENERATOR_VERSION,
} from "@/modules/pdf-generation/print-renderer";
import {
  createImageCrop,
  fullImageCrop,
  type ImageCrop,
} from "@/modules/posters/crop";
import { createPoster, type PosterSizeRequest } from "@/modules/posters/poster";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";
import type { ProjectId, UserId } from "@/modules/projects/project";

import {
  type ExportServices,
  storeGeneratedDocument,
} from "./export-printable-document";
import { generatePosterDocument } from "./generate-poster-document";
import { openProject } from "./manage-projects";

export type ExportPosterInput = {
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly assetId: AssetId;
  /** Un lado en mm; el otro sale de la proporción de la imagen. */
  readonly size: PosterSizeRequest;
  /** La parte de la imagen que se imprime, en pixels. Sin él, entera. */
  readonly crop?: ImageCrop;
  readonly print?: PrintConfiguration;
};

/**
 * Genera el póster de una imagen del proyecto y lo guarda.
 *
 * La salida del producto (docs/PRD.md §44). Todo se decide en el servidor a
 * partir de lo guardado: los bytes salen del bucket y el tamaño en pixels de
 * su propia cabecera, no de lo que diga el navegador. Si el cliente mintiera
 * sobre la proporción, el póster saldría deformado.
 */
export async function exportPoster(
  services: ExportServices,
  input: ExportPosterInput,
): Promise<ProjectExport> {
  const project = await openProject(services, input.projectId, input.userId);
  const asset = await services.assets.findById(input.assetId, input.userId);

  if (!asset || asset.projectId !== project.id) {
    // Igual que si no existiera: una imagen de otro proyecto no se nombra.
    throw new AssetNotFoundError(`Asset ${input.assetId} is not available.`);
  }

  const bytes = await services.assetStorage.get(asset.storageKey);
  const header = readImageHeader(bytes);
  // El recorte se valida contra la imagen real, no contra lo que el
  // navegador creyó ver. El póster toma su proporción.
  // Todo se mide sobre la imagen girada: es la que ve el usuario y la
  // que sale en el PDF (docs/pdf.md §97).
  const size = orientedSize(header);
  const crop = input.crop
    ? createImageCrop(size, input.crop)
    : fullImageCrop(size);
  const poster = createPoster(crop, input.size);
  const print = input.print ?? DEFAULT_PRINT_CONFIGURATION;

  const document = await generatePosterDocument({
    poster,
    image: {
      bytes,
      format: EMBEDDED_FORMATS[header.format],
      orientation: header.orientation,
    },
    imageSize: size,
    crop,
    title: project.name,
    renderer: services.renderer,
    print,
    fileName: `${project.name}-${Math.round(poster.width / 10)}cm.pdf`,
    creationDate: services.now(),
  });

  const generated = createProjectExport({
    id: services.newExportId(),
    projectId: project.id,
    sourceAssetId: asset.id,
    width: poster.width,
    height: poster.height,
    fileName: document.fileName,
    contentType: document.contentType,
    pageCount: document.pageCount,
    byteSize: document.bytes.byteLength,
    paperFormat: print.paper.format,
    paperOrientation: print.paper.orientation,
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

const EMBEDDED_FORMATS: Record<string, EmbeddedImageFormat> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WEBP",
};
