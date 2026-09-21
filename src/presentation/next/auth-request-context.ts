import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import type { AuthRequestContext } from "@/presentation/http/auth-endpoints";

import { createCookieClient } from "./supabase";

/** A dónde vuelve el usuario tras confirmar el correo. */
const SITE_URL_VARIABLE = "NEXT_PUBLIC_SITE_URL";

export async function authRequestContext(): Promise<AuthRequestContext> {
  const client = await createCookieClient();

  const siteUrl = process.env[SITE_URL_VARIABLE]?.trim();

  return {
    auth: new SupabaseAuthGateway(
      client,
      siteUrl ? `${siteUrl.replace(/\/$/, "")}/api/auth/confirm` : undefined,
    ),
  };
}
