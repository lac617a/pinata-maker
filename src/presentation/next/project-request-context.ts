import { cookies } from "next/headers";

import {
  createRequestClient,
  readCurrentUserId,
} from "../../infrastructure/supabase/request-client";
import { SupabaseProjectRepository } from "../../modules/projects/infrastructure/supabase-project-repository";
import type { ProjectRequestContext } from "../http/project-endpoints";

/**
 * Monta lo que necesita un endpoint de proyectos para esta petición.
 *
 * Es el único punto donde se juntan Next, Supabase y el dominio. Los
 * endpoints no conocen ninguno de los dos primeros, y por eso se pueden
 * probar con un repositorio en memoria.
 */
export async function projectRequestContext(): Promise<ProjectRequestContext> {
  const store = await cookies();

  const client = createRequestClient({
    getAll: () => store.getAll(),
    setAll: (updated) => {
      try {
        for (const cookie of updated) {
          store.set(cookie.name, cookie.value, cookie.options);
        }
      } catch {
        // Escribir cookies solo es posible en rutas y acciones. Desde un
        // Server Component, Next lo impide; la sesión se renueva entonces en
        // la siguiente petición que sí pueda escribirlas.
      }
    },
  });

  return {
    services: {
      repository: new SupabaseProjectRepository(client),
      now: () => new Date(),
      // El identificador lo genera la aplicación y no la base de datos, para
      // que el caso de uso pueda devolver el proyecto sin releerlo.
      newId: () => crypto.randomUUID(),
    },
    userId: await readCurrentUserId(client),
  };
}
