import type { Project, ProjectId, UserId } from "./project";

/**
 * Persistencia de proyectos.
 *
 * La aplicación depende de esta interfaz y no de una base de datos concreta.
 * Ver docs/storage.md §23 y docs/AGENTS.md §11.
 *
 * **Toda operación recibe el usuario que la pide.** No es comodidad: es la
 * forma de que el aislamiento entre usuarios (AC-15) no dependa de que quien
 * llama se acuerde de filtrar. Una firma que permitiese leer un proyecto sin
 * decir quién lo lee sería una invitación a saltarse la comprobación.
 *
 * El aislamiento se aplica además en la base de datos con RLS. Son dos
 * defensas para la misma regla, a propósito: la del dominio explica el
 * porqué, la de la base de datos no se puede olvidar.
 */
export interface ProjectRepository {
  /** Devuelve `null` cuando no existe **o no es de ese usuario**. */
  findById(id: ProjectId, userId: UserId): Promise<Project | null>;

  /** Proyectos de un usuario, del más reciente al más antiguo. */
  listByOwner(userId: UserId): Promise<Project[]>;

  save(project: Project): Promise<void>;

  /** Borrar algo ajeno no es un error silencioso: no borra nada. */
  delete(id: ProjectId, userId: UserId): Promise<void>;
}
