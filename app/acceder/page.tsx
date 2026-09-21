"use client";

import { useRouter } from "next/navigation";

import { CredentialsForm } from "@/components/session/credentials-form";
import { useSignIn } from "@/presentation/client/api/session";

export default function Page() {
  const router = useRouter();
  const signIn = useSignIn();

  return (
    <CredentialsForm
      title="Entrar"
      description="Tus proyectos y tus moldes guardados."
      submitLabel="Entrar"
      pending={signIn.isPending}
      error={signIn.error?.message}
      onSubmit={({ email, password }) =>
        signIn.mutate(
          { email, password },
          {
            onSuccess: () => {
              // La sesión viaja en cookies que acaba de escribir el servidor:
              // `refresh` hace que las páginas servidas vuelvan a mirarlas.
              router.replace("/proyectos");
              router.refresh();
            },
          },
        )
      }
      footer={{
        question: "¿Todavía no tienes cuenta?",
        linkLabel: "Crear una",
        href: "/crear-cuenta",
      }}
    />
  );
}
