// Comprueba que el entorno puede hablar con Supabase.
//
//   node --env-file=.env scripts/check-supabase.mjs
//
// No imprime ningún valor de configuración, solo si cada comprobación pasa.
// Ver docs/AGENTS.md §45.

import { createClient } from "@supabase/supabase-js";

const URL_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY_VARIABLE = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const results = [];

function report(check, passed, detail = "") {
  results.push({ check, passed, detail });
}

const url = process.env[URL_VARIABLE]?.trim();
const anonKey = process.env[ANON_KEY_VARIABLE]?.trim();

report(`${URL_VARIABLE} definida`, Boolean(url));
report(`${ANON_KEY_VARIABLE} definida`, Boolean(anonKey));

if (url && anonKey) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: authError } = await client.auth.getSession();
  report("el proyecto responde", !authError, authError?.message ?? "");

  const { data, error } = await client.from("projects").select("id").limit(1);

  // PostgREST no devuelve el código de Postgres cuando la tabla falta: la
  // busca en su cache de esquema y responde `PGRST205`. `42P01` es el código
  // de Postgres, por si la consulta llega a ejecutarse.
  const TABLE_MISSING_CODES = ["PGRST205", "42P01"];
  const tableMissing = TABLE_MISSING_CODES.includes(error?.code ?? "");

  report(
    "la tabla projects existe",
    !tableMissing,
    tableMissing ? "aplica supabase/migrations/0001_projects.sql" : "",
  );

  if (!tableMissing) {
    // Sin sesión, RLS no debe dejar ver ninguna fila. Que devuelva una lista
    // vacía es lo correcto; que devuelva filas significa que las políticas no
    // están aplicadas.
    report(
      "RLS oculta los proyectos a un anónimo",
      Boolean(error) || (data?.length ?? 0) === 0,
      error ? `denegado (${error.code})` : "lista vacía",
    );
  }
}

for (const { check, passed, detail } of results) {
  console.log(`${passed ? "OK  " : "FALLA"} ${check}${detail ? ` — ${detail}` : ""}`);
}

process.exit(results.every((result) => result.passed) ? 0 : 1);
