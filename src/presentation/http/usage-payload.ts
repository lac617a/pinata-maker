import type { UsageStatus } from "@/modules/usage/usage";

/** Cuánto le queda hoy, tal y como lo recibe el navegador. */
export function toUsagePayload(usage: UsageStatus) {
  return {
    level: usage.level,
    limit: usage.limit,
    used: usage.used,
    remaining: usage.remaining,
    resetsAt: usage.resetsAt.toISOString(),
  };
}
