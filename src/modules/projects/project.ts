import { InvalidProjectError, InvalidProjectTransitionError } from "./errors";

/**
 * Identidad estable de un proyecto.
 *
 * Nunca el nombre, ni la posición en una lista, ni una marca de tiempo: todos
 * cambian o se repiten. Ver docs/storage.md §12.
 */
export type ProjectId = string;

/** Identidad del usuario, tal y como la da la autenticación. */
export type UserId = string;

/**
 * Condición real en la que se encuentra un proyecto.
 *
 * Son los estados de `PRD.md` §22. `storage.md` §14 proponía además
 * `ARCHIVED`, que no se implementa: el panel de proyectos ofrece eliminar, no
 * archivar (`PRD.md` §21), y un estado que nada produce ni consume es una
 * etiqueta, no una condición del dominio.
 */
export type ProjectStatus = "DRAFT" | "PROCESSING" | "READY" | "ERROR";

/**
 * Trabajo del usuario sobre una figura.
 *
 * Contiene lo que identifica el proyecto y nada más. La imagen, la plantilla
 * y los archivos generados se relacionan con él, pero no viven dentro: tienen
 * su propio ciclo de vida. Ver docs/storage.md §10 y §11.
 */
export type Project = {
  readonly id: ProjectId;
  /**
   * Dueño del proyecto.
   *
   * Se persiste explícitamente y no se deduce de lo que mande el cliente.
   * Ver docs/storage.md §13 y AC-15.
   */
  readonly ownerId: UserId;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export const PROJECT_NAME_MAX_LENGTH = 120;

/**
 * Transiciones que existen.
 *
 * Un proyecto nace vacío, procesa, y acaba con una plantilla o con un fallo.
 * Volver a procesar es legítimo desde los dos finales: el usuario cambia la
 * imagen o las medidas, o reintenta lo que falló.
 */
const ALLOWED_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  DRAFT: ["PROCESSING"],
  PROCESSING: ["READY", "ERROR"],
  READY: ["PROCESSING"],
  ERROR: ["PROCESSING"],
};

export type CreateProjectInput = {
  readonly id: ProjectId;
  readonly ownerId: UserId;
  readonly name: string;
  /** El reloj es un parámetro para que el resultado sea reproducible. */
  readonly now: Date;
};

export function createProject(input: CreateProjectInput): Project {
  const name = assertValidName(input.name);

  assertPresent(input.id, "id");
  assertPresent(input.ownerId, "ownerId");
  assertValidDate(input.now, "now");

  return {
    id: input.id,
    ownerId: input.ownerId,
    name,
    status: "DRAFT",
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function renameProject(
  project: Project,
  name: string,
  now: Date,
): Project {
  assertValidDate(now, "now");

  return { ...project, name: assertValidName(name), updatedAt: now };
}

/**
 * Lleva el proyecto a otro estado.
 *
 * Rechaza las transiciones que no existen en lugar de aceptar cualquier
 * valor: el estado se muestra al usuario y dispara trabajo, así que ponerlo a
 * mano desde cualquier sitio lo vuelve inservible. Ver docs/PRD.md §22.
 */
export function transitionProject(
  project: Project,
  status: ProjectStatus,
  now: Date,
): Project {
  assertValidDate(now, "now");

  if (!ALLOWED_TRANSITIONS[project.status].includes(status)) {
    throw new InvalidProjectTransitionError(
      `A project cannot go from ${project.status} to ${status}.`,
    );
  }

  return { ...project, status, updatedAt: now };
}

/**
 * Indica si un usuario puede acceder al proyecto.
 *
 * La comprobación vive en el dominio, no en la ruta que la invoca: el
 * aislamiento entre usuarios es una regla del producto (AC-15), y la base de
 * datos la vuelve a aplicar por su cuenta con RLS. Ver docs/PRD.md §25.
 */
export function projectBelongsTo(project: Project, userId: UserId): boolean {
  return project.ownerId === userId;
}

function assertValidName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new InvalidProjectError("A project needs a name.");
  }

  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    throw new InvalidProjectError(
      `A project name cannot exceed ${PROJECT_NAME_MAX_LENGTH} characters, received ${trimmed.length}.`,
    );
  }

  return trimmed;
}

function assertPresent(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new InvalidProjectError(`A project needs a ${field}.`);
  }
}

function assertValidDate(value: Date, field: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new InvalidProjectError(`${field} must be a valid date.`);
  }
}
