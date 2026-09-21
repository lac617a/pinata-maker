import type { SupabaseClient } from "@supabase/supabase-js";

import type { DataAuthorizationStore } from "@/modules/accounts/data-authorization-store";
import { AuthServiceError } from "@/modules/accounts/errors";
import type { UserId } from "@/modules/projects/project";

/**
 * The proof of authorization on Supabase: read from `data_authorizations`
 * (RLS shows each person only their own rows, 0009) and written through
 * `record_my_data_authorization` (0011), since nobody inserts there directly.
 */
export class SupabaseDataAuthorizationStore implements DataAuthorizationStore {
  constructor(private readonly client: SupabaseClient) {}

  async hasAccepted(userId: UserId, policyVersion: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("data_authorizations")
      .select("policy_version")
      .eq("user_id", userId)
      .eq("policy_version", policyVersion)
      .limit(1);

    if (error) {
      throw new AuthServiceError("Could not read the data authorization.", {
        cause: error,
      });
    }

    return data.length > 0;
  }

  async record(_userId: UserId, policyVersion: string): Promise<void> {
    // The function takes the user from the session, never from the request.
    const { error } = await this.client.rpc("record_my_data_authorization", {
      policy_version: policyVersion,
    });

    if (error) {
      throw new AuthServiceError("Could not record the data authorization.", {
        cause: error,
      });
    }
  }
}
