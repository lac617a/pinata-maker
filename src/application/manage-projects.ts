import { ProjectNotFoundError } from "@/modules/projects/errors";
import {
  createProject as buildProject,
  type Project,
  type ProjectId,
  type ProjectStatus,
  renameProject,
  transitionProject,
  type UserId,
} from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

/**
 * Lo que el caso de uso necesita del mundo exterior.
 *
 * El reloj y el generador de identificadores son parámetros porque de otro
 * modo el resultado no sería reproducible y no habría forma de probarlo.
 * Ver docs/storage.md §12.
 */
export type ProjectServices = {
  readonly repository: ProjectRepository;
  readonly now: () => Date;
  readonly newId: () => ProjectId;
};

export type CreateProjectInput = {
  readonly ownerId: UserId;
  readonly name: string;
};

/**
 * Crea un proyecto del usuario.
 *
 * El dueño llega como argumento y no dentro de los datos del formulario: lo
 * decide quien autenticó la petición, no el cliente.
 * Ver docs/storage.md §13 y AC-15.
 */
export async function createProject(
  services: ProjectServices,
  input: CreateProjectInput,
): Promise<Project> {
  const project = buildProject({
    id: services.newId(),
    ownerId: input.ownerId,
    name: input.name,
    now: services.now(),
  });

  await services.repository.save(project);

  return project;
}

export async function listProjects(
  services: ProjectServices,
  ownerId: UserId,
): Promise<Project[]> {
  return services.repository.listByOwner(ownerId);
}

/**
 * Abre un proyecto del usuario.
 *
 * Un proyecto que no existe y uno que es de otro producen el mismo error a
 * propósito: distinguirlos permitiría averiguar qué identificadores existen.
 */
export async function openProject(
  services: ProjectServices,
  id: ProjectId,
  userId: UserId,
): Promise<Project> {
  const project = await services.repository.findById(id, userId);

  if (!project) {
    throw new ProjectNotFoundError(`Project ${id} is not available.`);
  }

  return project;
}

export async function renameUserProject(
  services: ProjectServices,
  id: ProjectId,
  userId: UserId,
  name: string,
): Promise<Project> {
  const renamed = renameProject(
    await openProject(services, id, userId),
    name,
    services.now(),
  );

  await services.repository.save(renamed);

  return renamed;
}

/**
 * Lleva el proyecto a otro estado del ciclo de vida.
 *
 * El caso de uso no decide qué transiciones existen: eso lo sabe el dominio.
 * Aquí solo se comprueba que el proyecto es de quien lo pide y se guarda.
 */
export async function advanceProject(
  services: ProjectServices,
  id: ProjectId,
  userId: UserId,
  status: ProjectStatus,
): Promise<Project> {
  const advanced = transitionProject(
    await openProject(services, id, userId),
    status,
    services.now(),
  );

  await services.repository.save(advanced);

  return advanced;
}
