import { createHmac } from "node:crypto";

import type { UserId } from "@/modules/projects/project";

import type { AccessLevel } from "./usage";

/** A quién se le cuenta el uso: su nivel y sus claves. */
export type UsageSubject = {
  readonly level: AccessLevel;
  readonly keys: readonly string[];
};

/**
 * Quien tiene cuenta se cuenta por su cuenta.
 *
 * Hoy todo usuario con cuenta es `REGISTERED`: el nivel de pago llegará con
 * el cobro, y entonces saldrá de su perfil (docs/usage.md §7).
 */
export function registeredSubject(userId: UserId): UsageSubject {
  return { level: "REGISTERED", keys: [`user:${userId}`] };
}

/**
 * El visitante sin cuenta se cuenta por su cookie **y** por su IP.
 *
 * Borrar la cookie no basta para empezar de cero, y dos personas con la
 * misma IP pero distinta cookie comparten el límite: es el precio de lo
 * primero, aceptado por el PRD §39 («contener el abuso normal»).
 *
 * Ninguna de las dos se guarda en claro. Se guarda su HMAC con un secreto
 * del servidor, y el de la IP lleva el día: la huella de hoy no se puede
 * relacionar con la de ayer. Ver docs/usage.md §5.
 */
export function anonymousSubject(input: {
  readonly visitorId: string;
  readonly ip: string | null;
  readonly day: string;
  readonly secret: string;
}): UsageSubject {
  const keys = [`visitor:${fingerprint(input.secret, input.visitorId)}`];

  if (input.ip) {
    keys.push(`ip:${fingerprint(input.secret, `${input.day}|${input.ip}`)}`);
  }

  return { level: "ANONYMOUS", keys };
}

function fingerprint(secret: string, value: string): string {
  // 128 bits bastan para no chocar y mantienen la clave corta.
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}
