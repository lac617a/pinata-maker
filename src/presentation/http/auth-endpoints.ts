import type { AuthGateway } from "@/modules/accounts/auth-gateway";
import { createCredentials } from "@/modules/accounts/credentials";
import { createDataAuthorization } from "@/modules/accounts/data-authorization";

import { jsonResponse, toErrorResponse } from "./error-response";

export type AuthRequestContext = {
  readonly auth: AuthGateway;
};

/**
 * Registro.
 *
 * Responde lo mismo tanto si la cuenta se acaba de crear como si la dirección
 * ya estaba registrada: «revisa tu correo». Decir «ese correo ya existe»
 * convertiría el formulario en una forma de averiguar quién tiene cuenta.
 *
 * Cuando el proyecto no exige confirmación, la sesión queda abierta y se dice
 * así, porque el usuario necesita saber si ya puede entrar.
 */
export async function handleSignUp(
  request: Request,
  context: AuthRequestContext,
): Promise<Response> {
  try {
    const body = await readCredentialsBody(request);
    const credentials = createCredentials(body);
    // Before creating anything: without it no personal data may be stored.
    const authorization = createDataAuthorization(
      body.acceptedDataPolicy,
      new Date(),
    );
    const outcome = await context.auth.signUp(credentials, authorization);

    if (outcome === "SIGNED_IN") {
      return jsonResponse({ status: "SIGNED_IN" }, 201);
    }

    return jsonResponse(
      {
        status: "CONFIRMATION_REQUIRED",
        message: "Te hemos enviado un correo para confirmar la cuenta.",
      },
      202,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Inicio de sesión.
 *
 * No devuelve el token: la sesión viaja en cookies que escribe el adaptador.
 * Un token en el cuerpo acabaría guardado en `localStorage`, donde cualquier
 * script de la página puede leerlo.
 */
export async function handleSignIn(
  request: Request,
  context: AuthRequestContext,
): Promise<Response> {
  try {
    await context.auth.signIn(
      createCredentials(await readCredentialsBody(request)),
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Cierre de sesión.
 *
 * Cerrar una sesión que no existe no es un error: el resultado que el usuario
 * pedía —no estar dentro— ya se cumple.
 */
export async function handleSignOut(
  context: AuthRequestContext,
): Promise<Response> {
  try {
    await context.auth.signOut();

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function readCredentialsBody(request: Request): Promise<{
  email?: unknown;
  password?: unknown;
  acceptedDataPolicy?: unknown;
}> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}
