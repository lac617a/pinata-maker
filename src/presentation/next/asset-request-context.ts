import { cookies } from "next/headers";

import {
  createRequestClient,
  readCurrentUserId,
} from "@/infrastructure/supabase/request-client";
import {
  PROJECT_ASSETS_BUCKET,
  SupabaseObjectStorage,
} from "@/infrastructure/supabase/supabase-object-storage";
import { SupabaseAssetRepository } from "@/modules/assets/infrastructure/supabase-asset-repository";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import type { AssetRequestContext } from "@/presentation/http/asset-endpoints";

export async function assetRequestContext(): Promise<AssetRequestContext> {
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
      assets: new SupabaseAssetRepository(client),
      storage: new SupabaseObjectStorage(client, PROJECT_ASSETS_BUCKET),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      newAssetId: () => crypto.randomUUID(),
    },
    userId: await readCurrentUserId(client),
  };
}
