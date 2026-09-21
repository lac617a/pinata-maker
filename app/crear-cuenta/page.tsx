"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CredentialsForm } from "@/components/session/credentials-form";
import { useSignUp } from "@/presentation/client/api/session";

export default function Page() {
  const router = useRouter();
  const signUp = useSignUp();
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (confirmation) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-serif text-3xl">Revisa tu correo</h1>
        <p className="text-muted-foreground text-sm">{confirmation}</p>
      </main>
    );
  }

  return (
    <CredentialsForm
      title="Crear cuenta"
      description="Ocho caracteres de contraseña como mínimo."
      submitLabel="Crear cuenta"
      pending={signUp.isPending}
      error={signUp.error?.message}
      onSubmit={(credentials) =>
        signUp.mutate(credentials, {
          onSuccess: (outcome) => {
            if (outcome.status === "SIGNED_IN") {
              router.replace("/proyectos");
              router.refresh();

              return;
            }

            // El proyecto puede exigir confirmación por correo. Decirlo es
            // parte de la respuesta: si no, el usuario se queda esperando.
            setConfirmation(
              outcome.message ??
                "Te hemos enviado un correo para confirmar la cuenta.",
            );
          },
        })
      }
      footer={{
        question: "¿Ya tienes cuenta?",
        linkLabel: "Entrar",
        href: "/acceder",
      }}
    />
  );
}
