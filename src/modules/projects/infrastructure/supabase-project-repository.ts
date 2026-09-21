import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { ProjectStorageError } from "@/modules/projects/errors";
import type {
  Project,
  ProjectId,
  ProjectStatus,
  UserId,
} from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

/**
 * Fila de `public.projects`.
 *
 * Es la forma que tiene la tabla, no la del dominio: vive aquí y no sale de
 * este archivo. Ver docs/storage.md §29 y §31.
 */
type ProjectRow = {
  readonly id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
};

const TABLE = "projects";

const COLUMNS = "id, owner_id, name, status, created_at, updated_at";

/**
 * Repositorio de proyectos sobre Supabase.
 *
 * Recibe el cliente ya construido en lugar de crearlo: quién es el usuario
 * depende de la petición, y montar el cliente es una decisión de la capa que
 * atiende esa petición.
 *
 * El filtrado por usuario está además en cada consulta, aunque RLS ya lo
 * aplique. No es redundancia inútil: si alguien despliega con las políticas
 * mal, las consultas siguen devolviendo lo que deben, y la intención queda
 * legible en el código. Ver AC-15.
 */
export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: ProjectId, userId: UserId): Promise<Project | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .eq("owner_id", userId)
      .maybeSingle<ProjectRow>();

    if (error) {
      throw storageError(`read project ${id}`, error);
    }

    return data ? toProject(data) : null;
  }

  async listByOwner(userId: UserId): Promise<Project[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select(COLUMNS)
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .returns<ProjectRow[]>();

    if (error) {
      throw storageError("list projects", error);
    }

    return (data ?? []).map(toProject);
  }

  async save(project: Project): Promise<void> {
    const { error } = await this.client.from(TABLE).upsert(toRow(project));

    if (error) {
      throw storageError(`save project ${project.id}`, error);
    }
  }

  async delete(id: ProjectId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("owner_id", userId);

    if (error) {
      throw storageError(`delete project ${id}`, error);
    }
  }
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    status: toStatus(row.status),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toRow(project: Project): ProjectRow {
  return {
    id: project.id,
    owner_id: project.ownerId,
    name: project.name,
    status: project.status,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  };
}

const STATUSES: readonly ProjectStatus[] = [
  "DRAFT",
  "PROCESSING",
  "READY",
  "ERROR",
];

/**
 * La base de datos tiene su propia restricción de estados, pero lo que llega
 * de fuera del proceso se valida igual: una migración pendiente o una fila
 * escrita a mano no deben meter un estado inventado en el dominio.
 * Ver docs/AGENTS.md §25.
 */
function toStatus(value: string): ProjectStatus {
  const status = STATUSES.find((candidate) => candidate === value);

  if (!status) {
    throw new ProjectStorageError(
      `The database returned an unknown project status: ${value}.`,
    );
  }

  return status;
}

/**
 * Traduce el fallo de la librería a un error del dominio.
 *
 * El mensaje dice qué se intentaba hacer, no qué devolvió Postgres: el
 * detalle técnico se registra, no se enseña. Ver docs/PRD.md §23.
 */
function storageError(
  operation: string,
  error: PostgrestError,
): ProjectStorageError {
  return new ProjectStorageError(`Could not ${operation}.`, { cause: error });
}
