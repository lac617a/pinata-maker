import { needsDataAuthorization } from "@/application/data-authorization";
import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import { SupabaseDataAuthorizationStore } from "@/modules/accounts/infrastructure/supabase-data-authorization-store";
import type { UserId } from "@/modules/projects/project";
import type { DataAuthorizationRequestContext } from "@/presentation/http/account-endpoints";

import { createCookieClient } from "./supabase";

export async function dataAuthorizationRequestContext(): Promise<DataAuthorizationRequestContext> {
  const client = await createCookieClient();

  return {
    services: {
      authorizations: new SupabaseDataAuthorizationStore(client),
      now: () => new Date(),
    },
    userId: await readCurrentUserId(client),
  };
}

/**
 * Whether the signed-in account has to accept the policy before going on.
 *
 * If the check itself fails — a migration not applied yet, Supabase down —
 * it lets the person through and logs it: a pending migration must not lock
 * every account out of its own projects (docs/legal.md §7).
 */
export async function mustAcceptDataPolicy(userId: UserId): Promise<boolean> {
  try {
    const { services } = await dataAuthorizationRequestContext();

    return await needsDataAuthorization(services, userId);
  } catch (error) {
    console.error("Could not check the data authorization", error);

    return false;
  }
}
