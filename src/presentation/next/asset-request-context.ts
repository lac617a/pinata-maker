import { cookies } from "next/headers";

import { SupabaseAssetRepository } from "../../modules/assets/infrastructure/supabase-asset-repository";
import { SupabaseAssetStorage } from "../../modules/assets/infrastructure/supabase-asset-storage";
import {
  createRequestClient,
  readCurrentUserId,
} from "../../infrastructure/supabase/request-client";
import { SupabaseProjectRepository } from "../../modules/projects/infrastructure/supabase-project-repository";
import type { AssetRequestContext } from "../http/asset-endpoints";

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
      storage: new SupabaseAssetStorage(client),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
      newAssetId: () => crypto.randomUUID(),
    },
    userId: await readCurrentUserId(client),
  };
}
