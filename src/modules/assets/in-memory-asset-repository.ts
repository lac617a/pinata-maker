import type { ProjectId, UserId } from "../projects/project";
import type { ProjectRepository } from "../projects/project-repository";
import type { Asset, AssetId } from "./asset";
import type { AssetRepository } from "./asset-repository";

/**
 * Implementación de referencia del repositorio de assets.
 *
 * Consulta el repositorio de proyectos para resolver la propiedad, porque un
 * asset es de quien sea su proyecto. En Supabase esa misma regla la aplica
 * RLS con un `exists` sobre `projects`.
 */
export class InMemoryAssetRepository implements AssetRepository {
  private readonly assets = new Map<AssetId, Asset>();

  constructor(private readonly projects: ProjectRepository) {}

  async findById(id: AssetId, userId: UserId): Promise<Asset | null> {
    const asset = this.assets.get(id);

    if (!asset || !(await this.ownsProject(asset.projectId, userId))) {
      return null;
    }

    return { ...asset };
  }

  async listByProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<Asset[]> {
    if (!(await this.ownsProject(projectId, userId))) {
      return [];
    }

    return [...this.assets.values()]
      .filter((asset) => asset.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((asset) => ({ ...asset }));
  }

  async save(asset: Asset, userId: UserId): Promise<void> {
    if (!(await this.ownsProject(asset.projectId, userId))) {
      // Igual que RLS: guardar en un proyecto ajeno no guarda nada.
      return;
    }

    this.assets.set(asset.id, { ...asset });
  }

  async delete(id: AssetId, userId: UserId): Promise<void> {
    if (await this.findById(id, userId)) {
      this.assets.delete(id);
    }
  }

  private async ownsProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<boolean> {
    return (await this.projects.findById(projectId, userId)) !== null;
  }
}
