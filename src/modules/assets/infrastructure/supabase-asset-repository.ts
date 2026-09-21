import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { ProjectId, UserId } from "../../projects/project";
import type { Asset, AssetId, AssetKind } from "../asset";
import type { AssetRepository } from "../asset-repository";
import { AssetStorageError } from "../errors";

/** Forma de la tabla, no la del dominio. Ver docs/storage.md §29 y §31. */
type AssetRow = {
  readonly id: string;
  readonly project_id: string;
  readonly kind: string;
  readonly storage_key: string;
  readonly mime_type: string;
  readonly byte_size: number;
  readonly original_name: string;
  readonly created_at: string;
};

const TABLE = "assets";

const COLUMNS =
  "id, project_id, kind, storage_key, mime_type, byte_size, original_name, created_at";

/**
 * Repositorio de assets sobre Supabase.
 *
 * El filtro por usuario lo aplica RLS a través del proyecto: aquí no hay un
 * `owner_id` que comparar, porque un asset no tiene dueño propio. Por eso las
 * consultas no llevan `eq("owner_id", ...)` como las de proyectos; la
 * comprobación equivalente vive en la política.
 */
export class SupabaseAssetRepository implements AssetRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: AssetId, _userId: UserId): Promise<Asset | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle<AssetRow>();

    if (error) {
      throw storageError(`read asset ${id}`, error);
    }

    return data ? toAsset(data) : null;
  }

  async listByProject(
    projectId: ProjectId,
    _userId: UserId,
  ): Promise<Asset[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .returns<AssetRow[]>();

    if (error) {
      throw storageError(`list assets of project ${projectId}`, error);
    }

    return (data ?? []).map(toAsset);
  }

  async save(asset: Asset, _userId: UserId): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(toRow(asset));

    if (error) {
      throw storageError(`save asset ${asset.id}`, error);
    }
  }

  async delete(id: AssetId, _userId: UserId): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);

    if (error) {
      throw storageError(`delete asset ${id}`, error);
    }
  }
}

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: toKind(row.kind),
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    originalName: row.original_name,
    createdAt: new Date(row.created_at),
  };
}

function toRow(asset: Asset): AssetRow {
  return {
    id: asset.id,
    project_id: asset.projectId,
    kind: asset.kind,
    storage_key: asset.storageKey,
    mime_type: asset.mimeType,
    byte_size: asset.byteSize,
    original_name: asset.originalName,
    created_at: asset.createdAt.toISOString(),
  };
}

const KINDS: readonly AssetKind[] = ["ORIGINAL_IMAGE"];

/** Lo que llega de fuera del proceso se valida, aunque la tabla lo restrinja. */
function toKind(value: string): AssetKind {
  const kind = KINDS.find((candidate) => candidate === value);

  if (!kind) {
    throw new AssetStorageError(
      `The database returned an unknown asset kind: ${value}.`,
    );
  }

  return kind;
}

function storageError(
  operation: string,
  error: PostgrestError,
): AssetStorageError {
  return new AssetStorageError(`Could not ${operation}.`, { cause: error });
}
