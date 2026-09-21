import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import { SupabaseTemplateVersionRepository } from "@/modules/templates/infrastructure/supabase-template-version-repository";
import type { TemplateRequestContext } from "@/presentation/http/template-endpoints";

import { createCookieClient } from "./supabase";

export async function templateRequestContext(): Promise<TemplateRequestContext> {
  const client = await createCookieClient();

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
