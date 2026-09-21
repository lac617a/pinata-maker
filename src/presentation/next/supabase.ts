import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  createRequestClient,
  readCurrentUserId,
} from "@/infrastructure/supabase/request-client";
import type { UserId } from "@/modules/projects/project";

/**
 * Cliente de Supabase con las cookies de la petición de Next.
 *
 * Estaba copiado en cada contexto de petición. Es el mismo trozo de
 * fontanería en todos, y tenerlo una vez evita que uno de ellos se quede
 * atrás cuando cambie.
 */
export async function createCookieClient(): Promise<SupabaseClient> {
  const store = await cookies();

  return createRequestClient({
    getAll: () => store.getAll(),
    setAll: (updated) => {
      try {
        for (const cookie of updated) {
          store.set(cookie.name, cookie.value, cookie.options);
        }
      } catch {
        // Solo las rutas y las acciones pueden escribir cookies.
      }
    },
  });
}

/**
 * Quién está dentro, para las páginas que se sirven desde el servidor.
 *
 * Valida contra el servidor de autenticación con `getUser`, no con la cookie
 * a secas: una página que decide qué enseñar no puede fiarse de lo que mande
 * el navegador. Ver docs/architecture.md §75.
 */
export async function readSessionUserId(): Promise<UserId | null> {
  return readCurrentUserId(await createCookieClient());
}
