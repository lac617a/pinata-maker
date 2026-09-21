/**
 * Errores de la generación de plantillas.
 *
 * Describen figuras o configuraciones que no pueden convertirse en una pieza
 * física. Ver docs/template.md §90.
 */

/**
 * La silueta no puede extruirse.
 *
 * El modelo de extrusión perimetral no cubre todas las siluetas; las que
 * quedan fuera deben fallar de forma explícita en lugar de aproximarse, que
 * produciría una plantilla que no se corresponde con la figura.
 * Ver docs/template.md §121.
 */
export class UnsupportedSilhouetteError extends Error {
  readonly code = "UNSUPPORTED_SILHOUETTE";

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedSilhouetteError";
  }
}

/** La configuración de la derivación no describe una plantilla construible. */
export class InvalidTemplateConfigurationError extends Error {
  readonly code = "INVALID_TEMPLATE_CONFIGURATION";

  constructor(message: string) {
    super(message);
    this.name = "InvalidTemplateConfigurationError";
  }
}

/**
 * Las piezas no forman una piñata montable.
 *
 * Ver docs/assembly.md §23 y §105.
 */
export class InvalidAssemblyError extends Error {
  readonly code = "INVALID_ASSEMBLY";

  constructor(message: string) {
    super(message);
    this.name = "InvalidAssemblyError";
  }
}

/**
 * La definición guardada no describe una plantilla del dominio.
 *
 * Una plantilla persistida vuelve del exterior del proceso y ahí no hay
 * tipos: lo que llega se valida con los constructores del dominio antes de
 * creerse. Ver docs/storage.md §29.
 */
export class InvalidTemplateDefinitionError extends Error {
  readonly code = "INVALID_TEMPLATE_DEFINITION";

  constructor(message: string) {
    super(message);
    this.name = "InvalidTemplateDefinitionError";
  }
}

/** La versión no existe, o su proyecto no es de quien pregunta. */
export class TemplateVersionNotFoundError extends Error {
  readonly code = "TEMPLATE_VERSION_NOT_FOUND";

  constructor(message: string) {
    super(message);
    this.name = "TemplateVersionNotFoundError";
  }
}

/**
 * Ese número de versión ya existe en el proyecto.
 *
 * Una versión publicada es inmutable, así que la respuesta a una colisión no
 * es sobrescribir: es decir que alguien publicó antes.
 * Ver docs/storage.md §17, §21 y §22.
 */
export class TemplateVersionConflictError extends Error {
  readonly code = "TEMPLATE_VERSION_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "TemplateVersionConflictError";
  }
}

/** Falló guardar o recuperar una versión. Ver docs/storage.md §77. */
export class TemplateStorageError extends Error {
  readonly code = "TEMPLATE_STORAGE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TemplateStorageError";
  }
}
