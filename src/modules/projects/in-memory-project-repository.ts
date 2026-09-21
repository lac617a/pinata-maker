import {
  type Project,
  projectBelongsTo,
  type ProjectId,
  type UserId,
} from "./project";
import type { ProjectRepository } from "./project-repository";

/**
 * Implementación de referencia del repositorio.
 *
 * Existe por dos motivos concretos, no como utilidad de tests genérica
 * (`AGENTS.md` §29):
 *
 * 1. Define qué significa cumplir el contrato. Las mismas pruebas se pasan a
 *    esta implementación y a la de Supabase, de modo que «el repositorio
 *    funciona» quiere decir lo mismo en las dos.
 * 2. Permite probar los casos de uso sin base de datos, igual que el dominio
 *    se prueba sin navegador.
 *
 * Guarda copias y devuelve copias: una implementación real no le da al que
 * llama una referencia a lo que hay guardado.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<ProjectId, Project>();

  async findById(id: ProjectId, userId: UserId): Promise<Project | null> {
    const project = this.projects.get(id);

    // Un proyecto ajeno se comporta como uno inexistente: distinguirlos
    // revelaría qué identificadores existen.
    if (!project || !projectBelongsTo(project, userId)) {
      return null;
    }

    return { ...project };
  }

  async listByOwner(userId: UserId): Promise<Project[]> {
    return [...this.projects.values()]
      .filter((project) => projectBelongsTo(project, userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((project) => ({ ...project }));
  }

  async save(project: Project): Promise<void> {
    this.projects.set(project.id, { ...project });
  }

  async delete(id: ProjectId, userId: UserId): Promise<void> {
    const project = this.projects.get(id);

    if (project && projectBelongsTo(project, userId)) {
      this.projects.delete(id);
    }
  }
}
