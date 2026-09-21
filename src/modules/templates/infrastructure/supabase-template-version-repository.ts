import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { ProjectId, UserId } from "../../projects/project";
import {
  TemplateStorageError,
  TemplateVersionConflictError,
} from "../errors";
import {
  deserializeTemplate,
  serializeTemplate,
} from "../template-definition";
import type {
  TemplateVersion,
  TemplateVersionId,
  TemplateVersionSummary,
} from "../template-version";
import type { TemplateVersionRepository } from "../template-version-repository";

/** Forma de la tabla, no la del dominio. Ver docs/storage.md §29 y §31. */
type TemplateVersionRow = {
  readonly id: string;
  readonly project_id: string;
  readonly version_number: number;
  readonly name: string;
  readonly width_mm: number;
  readonly height_mm: number;
  readonly depth_mm: number;
  readonly piece_count: number;
  readonly derivation_version: string;
  readonly schema_version: number;
  readonly source_asset_id: string | null;
  readonly created_at: string;
};

type TemplateVersionRowWithDefinition = TemplateVersionRow & {
  readonly definition: unknown;
};

const TABLE = "template_versions";

/**
 * Columnas del resumen: todo menos la geometría.
 *
 * Un listado no debe arrastrar un documento de cientos de kilobytes por cada
 * fila. Ver docs/storage.md §32.
 */
const SUMMARY_COLUMNS =
  "id, project_id, version_number, name, width_mm, height_mm, depth_mm, piece_count, derivation_version, schema_version, source_asset_id, created_at";

const FULL_COLUMNS = `${SUMMARY_COLUMNS}, definition`;

/** Violación de restricción única en PostgreSQL. */
const UNIQUE_VIOLATION = "23505";

/**
 * Repositorio de versiones sobre Supabase.
 *
 * El filtro por usuario lo aplica RLS a través del proyecto, igual que en
 * assets: una versión no tiene dueño propio.
 */
export class SupabaseTemplateVersionRepository
  implements TemplateVersionRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findById(
    id: TemplateVersionId,
    _userId: UserId,
  ): Promise<TemplateVersion | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(FULL_COLUMNS)
      .eq("id", id)
      .maybeSingle<TemplateVersionRowWithDefinition>();

    if (error) {
      throw storageError(`read template version ${id}`, error);
    }

    return data ? toVersion(data) : null;
  }

  async listByProject(
    projectId: ProjectId,
    _userId: UserId,
  ): Promise<TemplateVersionSummary[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(SUMMARY_COLUMNS)
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .returns<TemplateVersionRow[]>();

    if (error) {
      throw storageError(`list template versions of project ${projectId}`, error);
    }

    return (data ?? []).map(toSummary);
  }

  async findLatest(
    projectId: ProjectId,
    _userId: UserId,
  ): Promise<TemplateVersionSummary | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(SUMMARY_COLUMNS)
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle<TemplateVersionRow>();

    if (error) {
      throw storageError(`read the latest version of project ${projectId}`, error);
    }

    return data ? toSummary(data) : null;
  }

  /**
   * Inserta, nunca actualiza.
   *
   * `insert` y no `upsert`: un `upsert` convertiría la colisión de números en
   * una sustitución silenciosa, que es justo lo que la inmutabilidad
   * prohíbe. Ver docs/storage.md §17 y §22.
   */
  async create(version: TemplateVersion, _userId: UserId): Promise<void> {
    const { error } = await this.client.from(TABLE).insert(toRow(version));

    if (error?.code === UNIQUE_VIOLATION) {
      throw new TemplateVersionConflictError(
        `Version ${version.versionNumber} of project ${version.projectId} already exists.`,
      );
    }

    if (error) {
      throw storageError(`publish template version ${version.id}`, error);
    }
  }
}

function toSummary(row: TemplateVersionRow): TemplateVersionSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    versionNumber: row.version_number,
    name: row.name,
    width: row.width_mm,
    height: row.height_mm,
    depth: row.depth_mm,
    pieceCount: row.piece_count,
    derivationVersion: row.derivation_version,
    schemaVersion: row.schema_version,
    sourceAssetId: row.source_asset_id,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Fila a versión del dominio.
 *
 * La definición que devuelve la base de datos se valida y se vuelve a
 * serializar: así lo que sale de aquí es siempre un documento que el dominio
 * acepta, y no lo que alguien dejó escrito en la columna.
 */
function toVersion(row: TemplateVersionRowWithDefinition): TemplateVersion {
  return {
    ...toSummary(row),
    definition: serializeTemplate(deserializeTemplate(row.definition)),
  };
}

function toRow(version: TemplateVersion): TemplateVersionRowWithDefinition {
  return {
    id: version.id,
    project_id: version.projectId,
    version_number: version.versionNumber,
    name: version.name,
    width_mm: version.width,
    height_mm: version.height,
    depth_mm: version.depth,
    piece_count: version.pieceCount,
    derivation_version: version.derivationVersion,
    schema_version: version.schemaVersion,
    source_asset_id: version.sourceAssetId,
    definition: version.definition,
    created_at: version.createdAt.toISOString(),
  };
}

function storageError(
  operation: string,
  error: PostgrestError,
): TemplateStorageError {
  return new TemplateStorageError(`Could not ${operation}.`, { cause: error });
}
