import { InvalidUsageLimitsError } from "./errors";

/**
 * Quién usa la herramienta, a efectos de cuánto puede usarla.
 *
 * Ver docs/PRD.md §38. `PAID` existe ya aunque el cobro no: el modelo no
 * debe impedir añadirlo, y el límite se decide por nivel.
 */
export type AccessLevel = "ANONYMOUS" | "REGISTERED" | "PAID";

/** Documentos al día por nivel. */
export type UsageLimits = Readonly<Record<AccessLevel, number>>;

/**
 * Valores por defecto, decididos el 2026-09-21: tres PDF bastan para probar
 * un par de tamaños sin cuenta, y el registro los multiplica.
 * Ver docs/usage.md §3.
 */
export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  ANONYMOUS: 3,
  REGISTERED: 20,
  PAID: 200,
};

/** Variables que cambian los límites sin tocar código (PRD §39). */
export const USAGE_LIMIT_VARIABLES: Readonly<Record<AccessLevel, string>> = {
  ANONYMOUS: "USAGE_LIMIT_ANONYMOUS",
  REGISTERED: "USAGE_LIMIT_REGISTERED",
  PAID: "USAGE_LIMIT_PAID",
};

/**
 * Los límites, leídos del entorno con los valores por defecto detrás.
 *
 * Un valor que no es un entero positivo falla al leerlo: un límite de «tres
 * y medio» o vacío por un error de escritura dejaría la herramienta abierta
 * o cerrada sin que nadie lo note.
 */
export function readUsageLimits(
  environment: Record<string, string | undefined> = {},
): UsageLimits {
  const read = (level: AccessLevel): number => {
    const variable = USAGE_LIMIT_VARIABLES[level];
    const raw = environment[variable]?.trim();

    if (!raw) {
      return DEFAULT_USAGE_LIMITS[level];
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidUsageLimitsError(
        `${variable} must be a positive whole number.`,
      );
    }

    return value;
  };

  return {
    ANONYMOUS: read("ANONYMOUS"),
    REGISTERED: read("REGISTERED"),
    PAID: read("PAID"),
  };
}

/**
 * El día natural al que se apunta el uso, en UTC.
 *
 * Una zona fija y no la del visitante: la del navegador la elige el cliente,
 * y cambiarla daría un día nuevo. La interfaz enseña a qué hora local se
 * renueva. Ver docs/usage.md §4.
 */
export function usageDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Cuándo empieza el día siguiente, que es cuando el contador vuelve a cero. */
export function nextUsageReset(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/** Cuánto le queda hoy a alguien. Es lo que ve la interfaz. */
export type UsageStatus = {
  readonly level: AccessLevel;
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  readonly resetsAt: Date;
};

export function usageStatus(
  level: AccessLevel,
  limits: UsageLimits,
  used: number,
  now: Date,
): UsageStatus {
  const limit = limits[level];

  return {
    level,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextUsageReset(now),
  };
}
