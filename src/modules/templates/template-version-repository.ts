import type { ProjectId, UserId } from "../projects/project";
import type {
  TemplateVersion,
  TemplateVersionId,
  TemplateVersionSummary,
} from "./template-version";

/**
 * Persistencia de las versiones de plantilla de un proyecto.
 *
 * **No hay `save`, y eso es la mitad del diseño.** Una versión publicada es
 * inmutable (`AGENTS.md` §17, docs/storage.md §17): la única escritura que
 * existe es crear la siguiente. Una firma que permitiera guardar encima sería
 * una invitación a perder trabajo en silencio.
 *
 * Como en proyectos y assets, toda operación recibe quién la pide. La
 * propiedad de una versión es la de su proyecto, y la base de datos la vuelve
 * a aplicar con RLS.
 */
export interface TemplateVersionRepository {
  /** `null` cuando no existe o su proyecto no es de ese usuario. */
  findById(
    id: TemplateVersionId,
    userId: UserId,
  ): Promise<TemplateVersion | null>;

  /** Versiones de un proyecto, de la más reciente a la más antigua. */
  listByProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<TemplateVersionSummary[]>;

  /**
   * La última versión publicada, sin traer su geometría.
   *
   * Es de donde sale el número de la siguiente. Devuelve el resumen y no la
   * versión entera porque para contar no hace falta leer un documento de
   * cientos de kilobytes.
   */
  findLatest(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<TemplateVersionSummary | null>;

  /**
   * Publica una versión nueva.
   *
   * Falla con `TemplateVersionConflictError` si ese número ya existe en el
   * proyecto: dos publicaciones a la vez no pueden acabar compartiendo v4.
   * Ver docs/storage.md §21 y §22.
   */
  create(version: TemplateVersion, userId: UserId): Promise<void>;
}
