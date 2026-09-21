/**
 * Configuración del límite de uso que no es un número: el secreto de las
 * huellas del visitante anónimo.
 *
 * Con él, la cookie y la IP se guardan como HMAC y no en claro
 * (docs/usage.md §5). Sin él, una huella se podría recalcular desde fuera y
 * cualquiera podría gastar el cupo de otra IP.
 */

export const USAGE_SECRET_VARIABLE = "USAGE_HASH_SECRET";

/** Un secreto más corto se adivina: 32 caracteres al azar, como mínimo. */
export const USAGE_SECRET_MIN_LENGTH = 32;

export class MissingUsageConfigurationError extends Error {
  readonly code = "USAGE_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "MissingUsageConfigurationError";
  }
}

/** El mensaje nombra la variable, nunca su valor. */
export function readUsageSecret(
  environment: Record<string, string | undefined> = process.env,
): string {
  const value = environment[USAGE_SECRET_VARIABLE]?.trim();

  if (!value || value.length < USAGE_SECRET_MIN_LENGTH) {
    throw new MissingUsageConfigurationError(
      `${USAGE_SECRET_VARIABLE} must be set to at least ${USAGE_SECRET_MIN_LENGTH} random characters.`,
    );
  }

  return value;
}
