import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import type { ProjectRequestContext } from "@/presentation/http/project-endpoints";

import { createCookieClient } from "./supabase";

/**
 * Monta lo que necesita un endpoint de proyectos para esta petición.
 *
 * Es el único punto donde se juntan Next, Supabase y el dominio. Los
 * endpoints no conocen ninguno de los dos primeros, y por eso se pueden
 * probar con un repositorio en memoria.
 */
export async function projectRequestContext(): Promise<ProjectRequestContext> {
  const client = await createCookieClient();

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
