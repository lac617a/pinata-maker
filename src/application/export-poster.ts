import type { AssetId } from "@/modules/assets/asset";
import { AssetNotFoundError } from "@/modules/assets/errors";
import {
  createProjectExport,
  type ProjectExport,
} from "@/modules/exports/export";
import { PDF_GENERATOR_VERSION } from "@/modules/pdf-generation/print-renderer";
import type { ProjectId, UserId } from "@/modules/projects/project";

import {
  type ExportServices,
  storeGeneratedDocument,
} from "./export-printable-document";
import { makePosterDocument, type PosterRequest } from "./make-poster-document";
import { openProject } from "./manage-projects";

export type ExportPosterInput = PosterRequest & {
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly assetId: AssetId;
  /**
   * Se llama con el PDF ya generado y antes de guardarlo: es donde se cobra
   * el límite diario (docs/usage.md §8). Si falla, no se guarda nada.
   */
  readonly consume?: () => Promise<unknown>;
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
  const { document, poster, print } = await makePosterDocument({
    bytes,
    request: input,
    title: project.name,
    renderer: services.renderer,
    now: services.now(),
  });

  await input.consume?.();

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
