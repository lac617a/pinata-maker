import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import type { UserId } from "../../projects/project";
import type { AuthGateway, SignUpOutcome } from "../auth-gateway";
import type { Credentials } from "../credentials";
import { AuthenticationFailedError, AuthServiceError } from "../errors";

/**
 * Autenticación sobre Supabase Auth.
 *
 * Recibe el cliente ya ligado a la petición: quien atiende la petición es
 * quien sabe leer y escribir sus cookies, y la sesión se guarda ahí.
 */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(
    private readonly client: SupabaseClient,
    /** A dónde vuelve el usuario tras confirmar el correo. */
    private readonly confirmationRedirectUrl?: string,
  ) {}

  async signUp(credentials: Credentials): Promise<SignUpOutcome> {
    const { data, error } = await this.client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: this.confirmationRedirectUrl
        ? { emailRedirectTo: this.confirmationRedirectUrl }
        : undefined,
    });

    if (error) {
      throw serviceError("register the account", error);
    }

    // Sin sesión, el proyecto exige confirmar el correo. Supabase devuelve
    // además un usuario sin sesión cuando la dirección ya existía, y esa
    // ambigüedad es deliberada: las dos situaciones responden lo mismo.
    return data.session ? "SIGNED_IN" : "CONFIRMATION_REQUIRED";
  }

  async signIn(credentials: Credentials): Promise<UserId> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      // Cualquier rechazo del servicio se cuenta igual: ni la dirección
      // desconocida ni la contraseña mala se distinguen desde fuera.
      if (isRejection(error)) {
        throw new AuthenticationFailedError(
          "The email address or the password is not correct.",
        );
      }

      throw serviceError("sign in", error);
    }

    if (!data.user) {
      throw new AuthenticationFailedError(
        "The email address or the password is not correct.",
      );
    }

    return data.user.id;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw serviceError("sign out", error);
    }
  }
}

/**
 * Distingue «te he entendido y te digo que no» de «no he podido atenderte».
 *
 * Lo primero es un 401 para el usuario; lo segundo, un fallo del servicio que
 * no es culpa suya y que merece reintento.
 */
function isRejection(error: AuthError): boolean {
  return error.status === 400 || error.status === 401;
}

function serviceError(operation: string, error: AuthError): AuthServiceError {
  return new AuthServiceError(`Could not ${operation}.`, { cause: error });
}
