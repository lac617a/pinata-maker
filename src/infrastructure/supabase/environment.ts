/**
 * Configuración de Supabase, leída del entorno.
 *
 * Se lee en un único sitio y se valida al leerla: un `process.env.X` esparcido
 * por el código falla tarde, en la petición de un usuario, en lugar de al
 * arrancar.
 *
 * **Sobre `NEXT_PUBLIC_SUPABASE_ANON_KEY`:** llega al navegador a propósito y
 * eso no es una fuga. La clave anónima identifica al proyecto, no autoriza
 * nada por sí sola; quien decide qué puede ver cada usuario es Row Level
 * Security en la base de datos. Una clave de servicio sí sería un secreto, y
 * por eso no existe ninguna en este proyecto. Ver docs/AGENTS.md §45.
 */

export type SupabaseConfiguration = {
  readonly url: string;
  readonly anonKey: string;
};

/** Nombres de las variables. Los valores nunca se registran ni se muestran. */
export const SUPABASE_URL_VARIABLE = "NEXT_PUBLIC_SUPABASE_URL";

export const SUPABASE_ANON_KEY_VARIABLE = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export class MissingSupabaseConfigurationError extends Error {
  readonly code = "MISSING_SUPABASE_CONFIGURATION";

  constructor(message: string) {
    super(message);
    this.name = "MissingSupabaseConfigurationError";
  }
}

export function readSupabaseConfiguration(
  environment: Record<string, string | undefined> = process.env,
): SupabaseConfiguration {
  return {
    url: required(environment, SUPABASE_URL_VARIABLE),
    anonKey: required(environment, SUPABASE_ANON_KEY_VARIABLE),
  };
}

/**
 * El error nombra la variable que falta, nunca su valor ni el de ninguna
 * otra. Un mensaje de error acaba en un log.
 */
function required(
  environment: Record<string, string | undefined>,
  variable: string,
): string {
  const value = environment[variable]?.trim();

  if (!value) {
    throw new MissingSupabaseConfigurationError(
      `${variable} is not set: the application cannot reach Supabase.`,
    );
  }

  return value;
}
