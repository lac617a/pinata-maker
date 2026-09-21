import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountRemoval } from "@/application/delete-account";
import { AccountDeletionError } from "@/modules/accounts/errors";

/**
 * Deletes the signed-in account through `delete_my_account`
 * (0010_delete_own_account.sql): there is no service key to call the admin
 * API, and the function only ever touches the caller's own account.
 */
export class SupabaseAccountRemoval implements AccountRemoval {
  constructor(private readonly client: SupabaseClient) {}

  async deleteCurrentAccount(): Promise<void> {
    const { error } = await this.client.rpc("delete_my_account");

    if (error) {
      throw new AccountDeletionError("Could not delete the account.", {
        cause: error,
      });
    }

    // The account no longer exists, so the server may reject the sign-out;
    // what matters is that the session cookies are cleared here.
    await this.client.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
