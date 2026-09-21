import { cookies } from "next/headers";

import { createRequestClient } from "@/infrastructure/supabase/request-client";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import type { AuthRequestContext } from "@/presentation/http/auth-endpoints";

/** A dónde vuelve el usuario tras confirmar el correo. */
const SITE_URL_VARIABLE = "NEXT_PUBLIC_SITE_URL";

export async function authRequestContext(): Promise<AuthRequestContext> {
  const store = await cookies();

  const client = createRequestClient({
    getAll: () => store.getAll(),
    setAll: (updated) => {
      for (const cookie of updated) {
        store.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });

  const siteUrl = process.env[SITE_URL_VARIABLE]?.trim();

  return {
    auth: new SupabaseAuthGateway(
      client,
      siteUrl ? `${siteUrl.replace(/\/$/, "")}/api/auth/confirm` : undefined,
    ),
  };
}
