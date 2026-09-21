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

  // Migración 0002: tabla de assets y bucket privado.
  const assets = await client.from("assets").select("id").limit(1);
  const assetsMissing = TABLE_MISSING_CODES.includes(assets.error?.code ?? "");

  report(
    "la tabla assets existe",
    !assetsMissing,
    assetsMissing ? "aplica supabase/migrations/0002_assets.sql" : "",
  );

  if (!assetsMissing) {
    report(
      "RLS oculta los assets a un anónimo",
      Boolean(assets.error) || (assets.data?.length ?? 0) === 0,
      assets.error ? `denegado (${assets.error.code})` : "lista vacía",
    );
  }

  // Migración 0003: versiones de plantilla.
  const versions = await client
    .from("template_versions")
    .select("id")
    .limit(1);
  const versionsMissing = TABLE_MISSING_CODES.includes(
    versions.error?.code ?? "",
  );

  report(
    "la tabla template_versions existe",
    !versionsMissing,
    versionsMissing ? "aplica supabase/migrations/0003_template_versions.sql" : "",
  );

  if (!versionsMissing) {
    report(
      "RLS oculta las versiones a un anónimo",
      Boolean(versions.error) || (versions.data?.length ?? 0) === 0,
      versions.error ? `denegado (${versions.error.code})` : "lista vacía",
    );
  }

  // Migración 0004: exports y su bucket privado.
  const exports = await client.from("exports").select("id").limit(1);
  const exportsMissing = TABLE_MISSING_CODES.includes(exports.error?.code ?? "");

  report(
    "la tabla exports existe",
    !exportsMissing,
    exportsMissing ? "aplica supabase/migrations/0004_exports.sql" : "",
  );

  if (!exportsMissing) {
    report(
      "RLS oculta los exports a un anónimo",
      Boolean(exports.error) || (exports.data?.length ?? 0) === 0,
      exports.error ? `denegado (${exports.error.code})` : "lista vacía",
    );
  }

}

// Los buckets no se comprueban aquí.
//
// `storage.buckets` tiene sus propias políticas y la clave anónima no puede
// leerla: `getBucket` responde «Bucket not found» tanto si el bucket falta
// como si existe, así que la comprobación no distinguiría nada. Quien verifica
// los buckets de verdad es `pnpm test:integration`, que entra con una cuenta,
// sube un archivo, lo firma y comprueba que la URL pública no lo sirve.

for (const { check, passed, detail } of results) {
  console.log(`${passed ? "OK  " : "FALLA"} ${check}${detail ? ` — ${detail}` : ""}`);
}

process.exit(results.every((result) => result.passed) ? 0 : 1);
