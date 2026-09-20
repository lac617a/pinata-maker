import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  readSupabaseConfiguration,
  type SupabaseConfiguration,
} from "./environment";

export type SupabaseClientInput = {
  readonly configuration?: SupabaseConfiguration;
  /**
   * Token de acceso del usuario que hace la petición.
   *
   * Sin él, el cliente actúa como anónimo y las políticas RLS no le dejan ver
   * ningún proyecto. Con él, `auth.uid()` en la base de datos es ese usuario.
   */
  readonly accessToken?: string;
};

/**
 * Cliente de Supabase para una petición.
 *
 * No guarda sesión ni la refresca: en el servidor, cada petición trae su
 * propio token y compartir estado entre peticiones mezclaría usuarios.
 *
 * Quién es el usuario lo decide quien atiende la petición, no este módulo.
 */
export function createSupabaseClient(
  input: SupabaseClientInput = {},
): SupabaseClient {
  const configuration = input.configuration ?? readSupabaseConfiguration();

  return createClient(configuration.url, configuration.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: input.accessToken
      ? { headers: { Authorization: `Bearer ${input.accessToken}` } }
      : undefined,
  });
}
