import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

import type { UsageServices } from "@/application/daily-usage";
import { readCurrentUserId } from "@/infrastructure/supabase/request-client";
import { readUsageSecret } from "@/infrastructure/usage/environment";
import { JsPdfPrintRenderer } from "@/modules/pdf-generation/infrastructure/jspdf-print-renderer";
import { SupabaseUsageCounter } from "@/modules/usage/infrastructure/supabase-usage-counter";
import { readUsageLimits, usageDay } from "@/modules/usage/usage";
import {
  anonymousSubject,
  registeredSubject,
  type UsageSubject,
} from "@/modules/usage/usage-subject";
import type { UsageRequestContext } from "@/presentation/http/usage-endpoints";

import { createCookieClient } from "./supabase";

/** Cookie con la que se reconoce al visitante sin cuenta. */
const VISITOR_COOKIE = "pm_visitor";

/** Un año: el límite es diario, pero la cookie no tiene por qué caducar. */
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El contador y los límites, con el cliente de la petición. */
export function usageServices(client: SupabaseClient): UsageServices {
  return {
    usage: new SupabaseUsageCounter(client),
    limits: readUsageLimits(process.env),
    now: () => new Date(),
  };
}

/**
 * A quién se le cuenta el uso de esta petición, y con qué.
 *
 * Con sesión, su cuenta. Sin ella, su cookie y su IP (docs/usage.md §5). La
 * cookie se crea aquí la primera vez: es `httpOnly`, así que el navegador no
 * la lee ni la cambia desde JavaScript, aunque sí puede borrarla.
 */
export async function usageRequestContext(): Promise<UsageRequestContext> {
  const client = await createCookieClient();
  const services = usageServices(client);
  const userId = await readCurrentUserId(client);

  if (userId) {
    return {
      services: { ...services, renderer: new JsPdfPrintRenderer() },
      subject: () => registeredSubject(userId),
    };
  }

  const visitorId = await readOrCreateVisitor();
  const ip = clientIp(await headers());

  return {
    services: { ...services, renderer: new JsPdfPrintRenderer() },
    subject: (): UsageSubject =>
      anonymousSubject({
        visitorId,
        ip,
        day: usageDay(services.now()),
        // Se lee al usarlo: sin secreto, la petición falla con 503 y un
        // registro que dice qué variable falta.
        secret: readUsageSecret(),
      }),
  };
}

async function readOrCreateVisitor(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;

  if (existing && UUID.test(existing)) {
    return existing;
  }

  const created = crypto.randomUUID();

  try {
    store.set(VISITOR_COOKIE, created, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  } catch {
    // Solo las rutas pueden escribir cookies. Desde una página se cuenta con
    // la IP; la ruta la creará en la siguiente petición.
  }

  return created;
}

/**
 * La IP del visitante, como la ve el proxy de delante.
 *
 * `x-forwarded-for` lo fija la plataforma (Vercel, un balanceador); el
 * primer valor es el cliente. Sin proxy delante, cualquiera podría
 * inventarlo: por eso la IP nunca cuenta sola, siempre con la cookie
 * (docs/usage.md §5).
 */
function clientIp(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return forwarded || requestHeaders.get("x-real-ip")?.trim() || null;
}
