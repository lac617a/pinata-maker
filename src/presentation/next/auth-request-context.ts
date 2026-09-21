import { readSiteUrl } from "@/infrastructure/site-url";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import type { AuthRequestContext } from "@/presentation/http/auth-endpoints";

import { createCookieClient } from "./supabase";

export async function authRequestContext(): Promise<AuthRequestContext> {
  const client = await createCookieClient();

  return {
    auth: new SupabaseAuthGateway(
      client,
      // A dónde vuelve el usuario tras confirmar el correo.
      `${readSiteUrl()}/api/auth/confirm`,
    ),
  };
}
