import { createClient } from "@supabase/supabase-js";
import { describe } from "vitest";

import { readSupabaseConfiguration } from "@/infrastructure/supabase/environment";
import { usageDay } from "@/modules/usage/usage";
import { describeUsageCounter } from "@/modules/usage/usage-counter.contract";

import { SupabaseUsageCounter } from "./supabase-usage-counter";

/**
 * El contrato contra la base de datos real, con el rol anónimo: es el caso
 * que importa, un visitante sin cuenta contando sin clave de servicio.
 *
 * Necesita la migración 0008 aplicada. Se activa con
 * `SUPABASE_TEST_USAGE=1`; sin ella se salta. Ver docs/usage.md §6.
 */
const configured = process.env.SUPABASE_TEST_USAGE === "1";

describe.skipIf(!configured)("Supabase usage counter", () => {
  describeUsageCounter("Supabase", async () => {
    const configuration = readSupabaseConfiguration();
    const client = createClient(configuration.url, configuration.anonKey, {
      auth: { persistSession: false },
    });
    // Claves nuevas en cada ejecución: la base de datos no se vacía.
    const run = crypto.randomUUID().replaceAll("-", "");

    return {
      counter: new SupabaseUsageCounter(client),
      subject: (name) => `visitor:${run.slice(0, 20)}${name}`.slice(0, 80),
      day: usageDay(new Date()),
    };
  });
});
