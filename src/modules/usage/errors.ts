/**
 * Errores del límite de uso.
 *
 * Ver docs/PRD.md §39: un límite alcanzado no es un fallo del sistema, es un
 * estado previsto, y la interfaz tiene que poder distinguirlo para ofrecer
 * una salida.
 */

/** Ya no quedan documentos hoy para este nivel. */
export class UsageLimitReachedError extends Error {
  readonly code = "USAGE_LIMIT_REACHED";

  constructor(message: string) {
    super(message);
    this.name = "UsageLimitReachedError";
  }
}

/** La configuración de los límites no se puede leer. */
export class InvalidUsageLimitsError extends Error {
  readonly code = "INVALID_USAGE_LIMITS";

  constructor(message: string) {
    super(message);
    this.name = "InvalidUsageLimitsError";
  }
}

/** El contador no respondió: no se sabe cuánto queda. */
export class UsageCounterUnavailableError extends Error {
  readonly code = "USAGE_COUNTER_UNAVAILABLE";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UsageCounterUnavailableError";
  }
}
