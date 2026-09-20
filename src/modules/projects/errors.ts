/**
 * Errores de los proyectos del usuario.
 *
 * Ver docs/PRD.md §23: la interfaz necesita distinguirlos para decir algo
 * útil en lugar de «algo salió mal».
 */

/** El proyecto no cumple una invariante del dominio. */
export class InvalidProjectError extends Error {
  readonly code = "INVALID_PROJECT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidProjectError";
  }
}

/**
 * La transición de estado pedida no existe.
 *
 * Un proyecto no puede pasar de listo a error sin volver a procesarse: el
 * estado describe una condición real, no una etiqueta que se pueda fijar a
 * voluntad. Ver docs/PRD.md §22.
 */
export class InvalidProjectTransitionError extends Error {
  readonly code = "INVALID_PROJECT_TRANSITION";

  constructor(message: string) {
    super(message);
    this.name = "InvalidProjectTransitionError";
  }
}

/**
 * El proyecto no existe, o no es de quien lo pide.
 *
 * Es deliberadamente el mismo error para los dos casos: distinguirlos le
 * diría a un atacante qué identificadores existen. Ver docs/PRD.md §25 y
 * AC-15.
 */
export class ProjectNotFoundError extends Error {
  readonly code = "PROJECT_NOT_FOUND";

  constructor(message: string) {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

/** La operación de persistencia falló. Ver docs/storage.md §77. */
export class ProjectStorageError extends Error {
  readonly code = "PROJECT_STORAGE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProjectStorageError";
  }
}
