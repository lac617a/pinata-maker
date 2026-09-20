import { InvalidCredentialsError } from "./errors";

/**
 * Con qué entra un usuario.
 *
 * Validar la forma antes de enviarla al servicio de autenticación evita una
 * llamada de red por cada campo mal escrito, y deja el mensaje de error en un
 * idioma que el usuario entiende. Ver docs/AGENTS.md §25.
 */
export type Credentials = {
  readonly email: string;
  readonly password: string;
};

/**
 * Longitud mínima de la contraseña.
 *
 * El PRD no fija ninguna. Ocho es el mínimo por debajo del cual una
 * contraseña no resiste un ataque de diccionario, y Supabase admite seis por
 * defecto, así que el producto es más estricto que el servicio a propósito.
 * Es una decisión, no una regla heredada. Ver docs/AGENTS.md §35.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Longitud máxima, porque el hash de bcrypt trunca más allá de 72 bytes y
 * una contraseña muy larga daría una falsa sensación de seguridad.
 */
export const PASSWORD_MAX_LENGTH = 72;

export const EMAIL_MAX_LENGTH = 254;

/**
 * Comprobación de forma, no de existencia.
 *
 * No intenta validar una dirección según el RFC: eso es imposible sin
 * enviarle un correo, que es justo lo que hace la confirmación. Solo descarta
 * lo que seguro no es una dirección.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export function createCredentials(input: {
  email?: unknown;
  password?: unknown;
}): Credentials {
  const email = asText(input.email, "email").trim().toLowerCase();
  const password = asText(input.password, "password");

  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
    throw new InvalidCredentialsError(
      "The email address does not look like an address.",
    );
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new InvalidCredentialsError(
      `The password must have at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new InvalidCredentialsError(
      `The password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }

  return { email, password };
}

function asText(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new InvalidCredentialsError(`The ${field} is missing.`);
  }

  return value;
}
