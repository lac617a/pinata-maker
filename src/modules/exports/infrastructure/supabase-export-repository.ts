import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { ProjectId, UserId } from "../../projects/project";
import type {
  PaperFormat,
  PaperOrientation,
} from "../../printing/paper-format";
import { PAPER_FORMATS } from "../../printing/paper-format";
import type { ExportId, ProjectExport } from "../export";
import type { ExportRepository } from "../export-repository";
import { ExportStorageError } from "../errors";

/** Forma de la tabla, no la del dominio. Ver docs/storage.md §29 y §31. */
type ExportRow = {
  readonly id: string;
  readonly project_id: string;
  readonly template_version_id: string;
  readonly storage_key: string;
  readonly file_name: string;
  readonly content_type: string;
  readonly page_count: number;
  readonly byte_size: number;
  readonly paper_format: string;
  readonly paper_orientation: string;
  readonly generator_version: string;
  readonly created_at: string;
};

const TABLE = "exports";

const COLUMNS =
  "id, project_id, template_version_id, storage_key, file_name, content_type, page_count, byte_size, paper_format, paper_orientation, generator_version, created_at";

/**
 * Repositorio de exports sobre Supabase.
 *
 * El filtro por usuario lo aplica RLS a través del proyecto, igual que en
 * assets y versiones: un export no tiene dueño propio.
 */
export class SupabaseExportRepository implements ExportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(
    id: ExportId,
    _userId: UserId,
  ): Promise<ProjectExport | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle<ExportRow>();

    if (error) {
      throw storageError(`read export ${id}`, error);
    }

    return data ? toExport(data) : null;
  }

  async listByProject(
    projectId: ProjectId,
    _userId: UserId,
  ): Promise<ProjectExport[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<ExportRow[]>();

    if (error) {
      throw storageError(`list exports of project ${projectId}`, error);
    }

    return (data ?? []).map(toExport);
  }

  /**
   * Inserta, nunca actualiza.
   *
   * Un archivo generado es inmutable: volver a generar produce otro export.
   * Ver docs/storage.md §55.
   */
  async create(
    projectExport: ProjectExport,
    _userId: UserId,
  ): Promise<void> {
    const { error } = await this.client.from(TABLE).insert(toRow(projectExport));

    if (error) {
      throw storageError(`store export ${projectExport.id}`, error);
    }
  }

  async delete(id: ExportId, _userId: UserId): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);

    if (error) {
      throw storageError(`delete export ${id}`, error);
    }
  }
}

function toExport(row: ExportRow): ProjectExport {
  return {
    id: row.id,
    projectId: row.project_id,
    templateVersionId: row.template_version_id,
    storageKey: row.storage_key,
    fileName: row.file_name,
    contentType: row.content_type,
    pageCount: row.page_count,
    byteSize: Number(row.byte_size),
    paperFormat: toPaperFormat(row.paper_format),
    paperOrientation: toOrientation(row.paper_orientation),
    generatorVersion: row.generator_version,
    createdAt: new Date(row.created_at),
  };
}

function toRow(projectExport: ProjectExport): ExportRow {
  return {
    id: projectExport.id,
    project_id: projectExport.projectId,
    template_version_id: projectExport.templateVersionId,
    storage_key: projectExport.storageKey,
    file_name: projectExport.fileName,
    content_type: projectExport.contentType,
    page_count: projectExport.pageCount,
    byte_size: projectExport.byteSize,
    paper_format: projectExport.paperFormat,
    paper_orientation: projectExport.paperOrientation,
    generator_version: projectExport.generatorVersion,
    created_at: projectExport.createdAt.toISOString(),
  };
}

/** Lo que llega de fuera del proceso se valida, aunque la tabla lo restrinja. */
function toPaperFormat(value: string): PaperFormat {
  const format = PAPER_FORMATS.find((candidate) => candidate === value);

  if (!format) {
    throw new ExportStorageError(
      `The database returned an unknown paper format: ${value}.`,
    );
  }

  return format;
}

function toOrientation(value: string): PaperOrientation {
  if (value !== "PORTRAIT" && value !== "LANDSCAPE") {
    throw new ExportStorageError(
      `The database returned an unknown paper orientation: ${value}.`,
    );
  }

  return value;
}

function storageError(
  operation: string,
  error: PostgrestError,
): ExportStorageError {
  return new ExportStorageError(`Could not ${operation}.`, { cause: error });
}
