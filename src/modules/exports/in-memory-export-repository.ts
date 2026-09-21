import type { ProjectId, UserId } from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

import type { ExportId, ProjectExport } from "./export";
import type { ExportRepository } from "./export-repository";

/**
 * Implementación de referencia del repositorio de exports.
 *
 * Consulta el repositorio de proyectos para resolver la propiedad, igual que
 * assets y versiones: un export es de quien sea su proyecto. En Supabase esa
 * misma regla la aplica RLS con un `exists` sobre `projects`.
 */
export class InMemoryExportRepository implements ExportRepository {
  private readonly exports = new Map<ExportId, ProjectExport>();

  constructor(private readonly projects: ProjectRepository) {}

  async findById(id: ExportId, userId: UserId): Promise<ProjectExport | null> {
    const found = this.exports.get(id);

    if (!found || !(await this.ownsProject(found.projectId, userId))) {
      return null;
    }

    return { ...found };
  }

  async listByProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<ProjectExport[]> {
    if (!(await this.ownsProject(projectId, userId))) {
      return [];
    }

    return [...this.exports.values()]
      .filter((found) => found.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((found) => ({ ...found }));
  }

  async create(projectExport: ProjectExport, userId: UserId): Promise<void> {
    if (!(await this.ownsProject(projectExport.projectId, userId))) {
      // Igual que RLS: generar en un proyecto ajeno no guarda nada.
      return;
    }

    this.exports.set(projectExport.id, { ...projectExport });
  }

  async delete(id: ExportId, userId: UserId): Promise<void> {
    if (await this.findById(id, userId)) {
      this.exports.delete(id);
    }
  }

  private async ownsProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<boolean> {
    return (await this.projects.findById(projectId, userId)) !== null;
  }
}
