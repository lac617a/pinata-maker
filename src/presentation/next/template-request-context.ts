import { cookies } from "next/headers";

import {
  createRequestClient,
  readCurrentUserId,
} from "../../infrastructure/supabase/request-client";
import { SupabaseProjectRepository } from "../../modules/projects/infrastructure/supabase-project-repository";
import { SupabaseTemplateVersionRepository } from "../../modules/templates/infrastructure/supabase-template-version-repository";
import type { TemplateRequestContext } from "../http/template-endpoints";

export async function templateRequestContext(): Promise<TemplateRequestContext> {
  const store = await cookies();

  const client = createRequestClient({
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

  return {
    services: {
      repository: new SupabaseProjectRepository(client),
      templateVersions: new SupabaseTemplateVersionRepository(client),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      newTemplateVersionId: () => crypto.randomUUID(),
    },
    userId: await readCurrentUserId(client),
  };
}
