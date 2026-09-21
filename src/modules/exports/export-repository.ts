import type { ProjectId, UserId } from "@/modules/projects/project";

import type { ExportId, ProjectExport } from "./export";

/**
 * Persistencia de los archivos generados de un proyecto.
 *
 * Como en versiones de plantilla, no hay `save`: un export es un artefacto
 * inmutable (docs/storage.md §55). Volver a generar produce otro export, con
 * su propia identidad y su propio archivo.
 *
 * Sí hay `delete`, que versiones no tiene: un export es regenerable y ocupa
 * espacio, así que el usuario puede tirarlo. Borrarlo no pierde nada que no
 * se pueda volver a producir desde su versión.
 *
 * Toda operación recibe quién la pide. La propiedad de un export es la de su
 * proyecto, y la base de datos la vuelve a aplicar con RLS.
 */
export interface ExportRepository {
  /** `null` cuando no existe o su proyecto no es de ese usuario. */
  findById(id: ExportId, userId: UserId): Promise<ProjectExport | null>;

  /** Exports de un proyecto, del más reciente al más antiguo. */
  listByProject(projectId: ProjectId, userId: UserId): Promise<ProjectExport[]>;

  create(projectExport: ProjectExport, userId: UserId): Promise<void>;

  delete(id: ExportId, userId: UserId): Promise<void>;
}
