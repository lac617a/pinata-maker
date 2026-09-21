import type { SupabaseClient } from "@supabase/supabase-js";

import { UsageCounterUnavailableError } from "@/modules/usage/errors";
import type { UsageCounter } from "@/modules/usage/usage-counter";

/**
 * Contador de uso sobre Supabase.
 *
 * La tabla no se toca: solo sus dos funciones, que comprueban lo que reciben
 * y hacen el consumo atómico en la base de datos
 * (`0008_usage_counters.sql`, docs/usage.md §6). Funciona con el token del
 * usuario o con el rol anónimo; no hace falta clave de servicio.
 */
export class SupabaseUsageCounter implements UsageCounter {
  constructor(private readonly client: SupabaseClient) {}

  async used(subjects: readonly string[], day: string): Promise<number> {
    const { data, error } = await this.client.rpc("usage_used", {
      subjects,
      usage_day: day,
    });

    if (error || typeof data !== "number") {
      throw new UsageCounterUnavailableError(
        `Could not read the usage of ${day}.`,
        { cause: error },
      );
    }

    return data;
  }

  async consume(
    subjects: readonly string[],
    day: string,
    limit: number,
  ): Promise<{ allowed: boolean; used: number }> {
    const { data, error } = await this.client.rpc("usage_consume", {
      subjects,
      usage_day: day,
      day_limit: limit,
    });

    // `returns table` llega como una lista de una fila.
    const row = Array.isArray(data) ? data[0] : null;

    if (
      error ||
      !row ||
      typeof row.allowed !== "boolean" ||
      typeof row.used !== "number"
    ) {
      throw new UsageCounterUnavailableError(
        `Could not count the usage of ${day}.`,
        { cause: error },
      );
    }

    return { allowed: row.allowed, used: row.used };
  }
}
