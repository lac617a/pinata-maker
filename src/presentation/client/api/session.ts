import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "@/presentation/client/api-client";

/**
 * Sesión del usuario en el navegador.
 *
 * Aquí no se guarda nada: la sesión vive en cookies que escribe el servidor
 * (`accounts/infrastructure/supabase-auth-gateway.ts`). El navegador solo
 * pide entrar o salir y luego recarga lo que el servidor le diga.
 */
export type Credentials = {
  readonly email: string;
  readonly password: string;
};

export type SignUpOutcome = {
  readonly status: "SIGNED_IN" | "CONFIRMATION_REQUIRED";
  readonly message?: string;
};

export function useSignIn() {
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      apiRequest<void>("/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (
      credentials: Credentials & { readonly acceptedDataPolicy: boolean },
    ) =>
      apiRequest<SignUpOutcome>("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: () =>
      apiRequest<void>("/api/auth/sign-out", { method: "POST" }),
  });
}
