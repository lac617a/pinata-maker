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
