import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import {
  PROJECT_EXPORTS_BUCKET,
  SupabaseObjectStorage,
} from "@/infrastructure/supabase/supabase-object-storage";
import { SupabaseExportRepository } from "@/modules/exports/infrastructure/supabase-export-repository";
import { JsPdfPrintRenderer } from "@/modules/pdf-generation/infrastructure/jspdf-print-renderer";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import { SupabaseTemplateVersionRepository } from "@/modules/templates/infrastructure/supabase-template-version-repository";
import type { ExportRequestContext } from "@/presentation/http/export-endpoints";

import { createCookieClient } from "./supabase";

/**
 * Único punto donde se juntan Next, Supabase, el renderer y el dominio.
 *
 * Aquí es donde se decide qué implementación del renderer se usa. El caso de
 * uso solo conoce la interfaz. Ver docs/printing.md §66.
 */
export async function exportRequestContext(): Promise<ExportRequestContext> {
  const client = await createCookieClient();

  return {
    services: {
      repository: new SupabaseProjectRepository(client),
      templateVersions: new SupabaseTemplateVersionRepository(client),
      exports: new SupabaseExportRepository(client),
      exportStorage: new SupabaseObjectStorage(client, PROJECT_EXPORTS_BUCKET),
      renderer: new JsPdfPrintRenderer(),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      newTemplateVersionId: () => crypto.randomUUID(),
      newExportId: () => crypto.randomUUID(),
    },
    userId: await readCurrentUserId(client),
  };
}
