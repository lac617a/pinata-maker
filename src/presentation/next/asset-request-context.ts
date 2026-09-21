import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import {
  PROJECT_ASSETS_BUCKET,
  SupabaseObjectStorage,
} from "@/infrastructure/supabase/supabase-object-storage";
import { SupabaseAssetRepository } from "@/modules/assets/infrastructure/supabase-asset-repository";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import type { AssetRequestContext } from "@/presentation/http/asset-endpoints";

import { createCookieClient } from "./supabase";

export async function assetRequestContext(): Promise<AssetRequestContext> {
  const client = await createCookieClient();

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
