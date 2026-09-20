import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserId } from "../../modules/projects/project";
import {
  readSupabaseConfiguration,
  type SupabaseConfiguration,
} from "./environment";

/**
 * Las cookies de una petición.
 *
 * Se declara aquí en lugar de importar el tipo de Next para que este archivo
 * no dependa del framework: lo que necesita es leer y escribir cookies, no
 * saber quién se las da. Ver docs/AGENTS.md §10.
 */
export type RequestCookies = {
  getAll(): { readonly name: string; readonly value: string }[];
  setAll(
    cookies: {
      readonly name: string;
      readonly value: string;
      readonly options?: CookieOptions;
    }[],
  ): void;
};

/**
 * Cliente de Supabase ligado a una petición.
 *
 * La sesión viaja en cookies, así que el cliente tiene que poder leerlas y
 * renovarlas. Cada petición construye el suyo: compartirlo entre peticiones
 * mezclaría usuarios.
 */
export function createRequestClient(
  cookies: RequestCookies,
  configuration: SupabaseConfiguration = readSupabaseConfiguration(),
): SupabaseClient {
  return createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (updated) => cookies.setAll(updated),
    },
  });
}

/**
 * Usuario autenticado de la petición, o `null`.
 *
 * Usa `getUser` y **no** `getSession`. La sesión que viaja en la cookie la
 * manda el cliente y podría estar manipulada; `getUser` la valida contra el
 * servidor de autenticación. En el servidor, confiar en `getSession` es
 * confiar en el navegador.
 *
 * Ver docs/PRD.md §25 y docs/AGENTS.md §45.
 */
export async function readCurrentUserId(
  client: SupabaseClient,
): Promise<UserId | null> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}
