import { UsageLimitReachedError } from "@/modules/usage/errors";
import {
  usageDay,
  type UsageLimits,
  type UsageStatus,
  usageStatus,
} from "@/modules/usage/usage";
import type { UsageCounter } from "@/modules/usage/usage-counter";
import type { UsageSubject } from "@/modules/usage/usage-subject";

export type UsageServices = {
  readonly usage: UsageCounter;
  readonly limits: UsageLimits;
  readonly now: () => Date;
};

/** Cuánto le queda hoy. Es lo que la interfaz enseña antes de empezar. */
export async function readUsage(
  services: UsageServices,
  subject: UsageSubject,
): Promise<UsageStatus> {
  const now = services.now();
  const used = await services.usage.used(subject.keys, usageDay(now));

  return usageStatus(subject.level, services.limits, used, now);
}

/**
 * Falla antes de trabajar si ya no queda nada.
 *
 * Es un atajo, no la garantía: generar un PDF cuesta, y no tiene sentido
 * hacerlo para negarlo después. Quien garantiza el límite es `consumeUsage`.
 */
export async function assertUsageLeft(
  services: UsageServices,
  subject: UsageSubject,
): Promise<UsageStatus> {
  const status = await readUsage(services, subject);

  if (status.remaining === 0) {
    throw limitReached(status);
  }

  return status;
}

/**
 * Se lleva uno del cupo de hoy, o falla si ya no queda.
 *
 * Se llama con el documento ya generado y antes de entregarlo: un error al
 * validar la medida o el recorte no gasta nada, y dos peticiones a la vez no
 * pueden llevarse las dos el último (docs/usage.md §8).
 */
export async function consumeUsage(
  services: UsageServices,
  subject: UsageSubject,
): Promise<UsageStatus> {
  const now = services.now();
  const limit = services.limits[subject.level];
  const result = await services.usage.consume(
    subject.keys,
    usageDay(now),
    limit,
  );
  const status = usageStatus(subject.level, services.limits, result.used, now);

  if (!result.allowed) {
    throw limitReached(status);
  }

  return status;
}

function limitReached(status: UsageStatus): UsageLimitReachedError {
  return new UsageLimitReachedError(
    `The ${status.level} limit of ${status.limit} documents a day is reached until ${status.resetsAt.toISOString()}.`,
  );
}
