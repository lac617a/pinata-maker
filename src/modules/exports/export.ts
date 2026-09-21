import type { AssetId } from "@/modules/assets/asset";
import type { Millimeters } from "@/modules/geometry/units";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import type { ProjectId } from "@/modules/projects/project";
import type { TemplateVersionId } from "@/modules/templates/template-version";

import { InvalidExportError } from "./errors";

export type ExportId = string;

/**
 * Archivo generado a partir de una versión de plantilla.
 *
 * Se llama `ProjectExport` y no `Export` porque `export` es una palabra
 * reservada del lenguaje: `export type Export` compila, pero no se lee.
 *
 * Es un **artefacto** (docs/storage.md §50): no sustituye a la plantilla, se
 * deriva de ella. Y es inmutable (§55): si la plantilla cambia, el PDF ya
 * generado sigue correspondiéndose con la versión con la que se hizo, que es
 * la que el usuario tiene impresa y recortada.
 */
export type ProjectExport = {
  readonly id: ExportId;
  readonly projectId: ProjectId;
  /**
   * Versión de plantilla de la que salió, si salió de una.
   *
   * Es lo que permite reproducir el contexto del archivo: con qué molde se
   * generó. Ver docs/storage.md §53 y §54.
   */
  readonly templateVersionId: TemplateVersionId | null;
  /**
   * Imagen de la que salió un póster (docs/PRD.md §44).
   *
   * Un documento sale de una versión de plantilla o de una imagen: siempre de
   * algo que se pueda nombrar, para poder decir qué se imprimió.
   */
  readonly sourceAssetId: AssetId | null;
  /** Tamaño físico impreso, en mm. Lo que el usuario pidió, no el papel. */
  readonly width: Millimeters | null;
  readonly height: Millimeters | null;
  /** Dónde vive el archivo. Solo la infraestructura lo necesita (§39, §40). */
  readonly storageKey: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly pageCount: number;
  readonly byteSize: number;
  /** Con qué papel se repartió: dos exports de la misma versión difieren. */
  readonly paperFormat: PaperFormat;
  readonly paperOrientation: PaperOrientation;
  /** Con qué generador se produjo. Ver docs/storage.md §54. */
  readonly generatorVersion: string;
  readonly createdAt: Date;
};

/**
 * Ruta del archivo dentro del almacenamiento.
 *
 * Determinista y organizada por proyecto, igual que la de los assets: borrar
 * un proyecto es borrar una carpeta, y dos archivos nunca colisionan.
 * Ver docs/storage.md §41 y §51.
 */
export function exportStorageKey(input: {
  projectId: ProjectId;
  exportId: ExportId;
}): string {
  return `projects/${input.projectId}/exports/${input.exportId}/document.pdf`;
}

export type CreateProjectExportInput = {
  readonly id: ExportId;
  readonly projectId: ProjectId;
  readonly templateVersionId?: TemplateVersionId | null;
  readonly sourceAssetId?: AssetId | null;
  readonly width?: Millimeters | null;
  readonly height?: Millimeters | null;
  readonly fileName: string;
  readonly contentType: string;
  readonly pageCount: number;
  readonly byteSize: number;
  readonly paperFormat: PaperFormat;
  readonly paperOrientation: PaperOrientation;
  readonly generatorVersion: string;
  readonly now: Date;
};

export function createProjectExport(
  input: CreateProjectExportInput,
): ProjectExport {
  if (input.id.trim().length === 0 || input.projectId.trim().length === 0) {
    throw new InvalidExportError("An export needs an id and a project.");
  }

  if (!input.templateVersionId && !input.sourceAssetId) {
    throw new InvalidExportError(
      "An export needs the template version or the image it came from.",
    );
  }

  if (!Number.isInteger(input.pageCount) || input.pageCount < 1) {
    throw new InvalidExportError(
      `An export must have at least one page, received ${input.pageCount}.`,
    );
  }

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    throw new InvalidExportError(
      `An export must have a size greater than 0 bytes, received ${input.byteSize}.`,
    );
  }

  return {
    id: input.id,
    projectId: input.projectId,
    templateVersionId: input.templateVersionId ?? null,
    sourceAssetId: input.sourceAssetId ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    storageKey: exportStorageKey({
      projectId: input.projectId,
      exportId: input.id,
    }),
    fileName: input.fileName,
    contentType: input.contentType,
    pageCount: input.pageCount,
    byteSize: input.byteSize,
    paperFormat: input.paperFormat,
    paperOrientation: input.paperOrientation,
    generatorVersion: input.generatorVersion,
    createdAt: input.now,
  };
}
