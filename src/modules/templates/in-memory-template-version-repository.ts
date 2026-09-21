import type { ProjectId, UserId } from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

import { TemplateVersionConflictError } from "./errors";
import {
  summarizeTemplateVersion,
  type TemplateVersion,
  type TemplateVersionId,
  type TemplateVersionSummary,
} from "./template-version";
import type { TemplateVersionRepository } from "./template-version-repository";

/**
 * Implementación de referencia del repositorio de versiones.
 *
 * Consulta el repositorio de proyectos para resolver la propiedad, igual que
 * el de assets: una versión es de quien sea su proyecto. En Supabase esa
 * misma regla la aplica RLS con un `exists` sobre `projects`.
 */
export class InMemoryTemplateVersionRepository implements TemplateVersionRepository {
  private readonly versions = new Map<TemplateVersionId, TemplateVersion>();

  constructor(private readonly projects: ProjectRepository) {}

  async findById(
    id: TemplateVersionId,
    userId: UserId,
  ): Promise<TemplateVersion | null> {
    const version = this.versions.get(id);

    if (!version || !(await this.ownsProject(version.projectId, userId))) {
      return null;
    }

    return version;
  }

  async listByProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<TemplateVersionSummary[]> {
    if (!(await this.ownsProject(projectId, userId))) {
      return [];
    }

    return [...this.versions.values()]
      .filter((version) => version.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map(summarizeTemplateVersion);
  }

  async findLatest(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<TemplateVersionSummary | null> {
    return (await this.listByProject(projectId, userId))[0] ?? null;
  }

  async create(version: TemplateVersion, userId: UserId): Promise<void> {
    if (!(await this.ownsProject(version.projectId, userId))) {
      // Igual que RLS: publicar en un proyecto ajeno no publica nada.
      return;
    }

    const taken = [...this.versions.values()].some(
      (existing) =>
        existing.projectId === version.projectId &&
        existing.versionNumber === version.versionNumber,
    );

    if (taken || this.versions.has(version.id)) {
      // La misma regla que la restricción única de la tabla. Sin ella, la
      // implementación en memoria aceptaría lo que la real rechaza.
      throw new TemplateVersionConflictError(
        `Version ${version.versionNumber} of project ${version.projectId} already exists.`,
      );
    }

    this.versions.set(version.id, version);
  }

  private async ownsProject(
    projectId: ProjectId,
    userId: UserId,
  ): Promise<boolean> {
    return (await this.projects.findById(projectId, userId)) !== null;
  }
}
