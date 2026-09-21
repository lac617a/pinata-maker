"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAcceptDataPolicy } from "@/presentation/client/api/session";

/**
 * Asked once, before the projects: the account has not accepted the current
 * data policy (created before the proof was kept, or the policy changed).
 * Same box as at sign-up, never pre-ticked (docs/legal.md §7).
 */
export function DataAuthorizationGate() {
  const router = useRouter();
  const accept = useAcceptDataPolicy();
  const [accepted, setAccepted] = useState(false);

  return (
    <main className="mx-auto max-w-lg space-y-6 py-10">
      <div className="space-y-3">
        <h1 className="font-serif text-3xl">Antes de seguir</h1>
        <p className="text-muted-foreground">
          Hemos actualizado cómo tratamos tus datos para cumplir la ley
          colombiana de protección de datos (Ley 1581 de 2012). Necesitamos tu
          autorización para seguir guardando tus proyectos.
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          accept.mutate(
            { acceptedDataPolicy: accepted },
            {
              onSuccess: () => router.refresh(),
              onError: (error) => toast.error(error.message),
            },
          );
        }}
      >
        <div className="flex items-start gap-3 text-sm">
          <input
            id="data-policy-gate"
            type="checkbox"
            required
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="accent-primary mt-0.5 size-4 shrink-0"
          />
          <label htmlFor="data-policy-gate" className="text-muted-foreground">
            Autorizo el tratamiento de mis datos personales según la{" "}
            <Link href="/privacidad" className="text-foreground underline">
              política de tratamiento de datos
            </Link>{" "}
            y acepto los{" "}
            <Link href="/terminos" className="text-foreground underline">
              términos de uso
            </Link>
            .
          </label>
        </div>

        <Button type="submit" disabled={!accepted || accept.isPending}>
          {accept.isPending ? "Un momento…" : "Continuar"}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        Si no quieres autorizarlo, puedes cerrar sesión o pedirnos que borremos
        tu cuenta escribiendo a la dirección de la política.
      </p>
    </main>
  );
}
