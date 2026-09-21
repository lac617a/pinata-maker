import type { ProjectId, UserId } from "@/modules/projects/project";

import type { Asset, AssetId } from "./asset";

/**
 * Persistencia de los assets de un proyecto.
 *
 * Igual que en proyectos, toda operación recibe quién la pide. La propiedad
 * de un asset es la de su proyecto, y comprobarla aquí evita que una ruta
 * nueva se salte el filtro. La base de datos lo vuelve a aplicar con RLS.
 * Ver docs/storage.md §142 y AC-15.
 */
export interface AssetRepository {
  /** `null` cuando no existe o su proyecto no es de ese usuario. */
  findById(id: AssetId, userId: UserId): Promise<Asset | null>;

  /** Assets de un proyecto, del más reciente al más antiguo. */
  listByProject(projectId: ProjectId, userId: UserId): Promise<Asset[]>;

  save(asset: Asset, userId: UserId): Promise<void>;

  delete(id: AssetId, userId: UserId): Promise<void>;
}
