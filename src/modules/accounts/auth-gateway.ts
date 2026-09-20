import type { UserId } from "../projects/project";
import type { Credentials } from "./credentials";

/**
 * Qué ocurre tras registrarse.
 *
 * Depende de si el proyecto exige confirmar el correo. El caso de uso no lo
 * decide: lo informa, para que la interfaz diga «revisa tu correo» o entre
 * directamente.
 */
export type SignUpOutcome = "SIGNED_IN" | "CONFIRMATION_REQUIRED";

/**
 * Servicio de autenticación.
 *
 * El dominio no conoce Supabase Auth. Lo que necesita es que alguien
 * convierta unas credenciales en un usuario y mantenga la sesión; cómo lo
 * haga es infraestructura. Ver docs/AGENTS.md §10 y docs/PRD.md §24.
 */
export interface AuthGateway {
  /**
   * Registra una cuenta.
   *
   * **No revela si la dirección ya estaba registrada.** Responder «ese correo
   * ya existe» convierte el formulario de registro en una forma de averiguar
   * quién tiene cuenta en el sitio. Quien ya la tenga recibirá un correo que
   * se lo recuerde, que es donde esa información sí es privada.
   */
  signUp(credentials: Credentials): Promise<SignUpOutcome>;

  /** Falla igual con una dirección desconocida que con una contraseña mala. */
  signIn(credentials: Credentials): Promise<UserId>;

  signOut(): Promise<void>;
}
