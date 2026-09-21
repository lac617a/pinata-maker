"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useUsage } from "@/presentation/client/api/usage";

/**
 * Cuánto queda hoy, antes de que el usuario invierta trabajo (PRD §39).
 *
 * Un límite alcanzado no es un error: se explica como un estado previsto y
 * se ofrece una salida —crear cuenta si no la tiene, o la hora a la que se
 * renueva—. Ver docs/usage.md §9.
 */
export function UsageNotice() {
  const usage = useUsage();

  // Si el contador no responde no se inventa nada: el servidor decide al
  // descargar.
  if (!usage.data) {
    return null;
  }

  const { level, limit, remaining, resetsAt } = usage.data;
  const renews = new Date(resetsAt).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const anonymous = level === "ANONYMOUS";

  if (remaining > 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Te {remaining === 1 ? "queda" : "quedan"}{" "}
        <strong className="text-foreground">
          {remaining} de {limit} PDF
        </strong>{" "}
        hoy. Se renuevan a las {renews}.
        {anonymous ? (
          <>
            {" "}
            <Link href="/crear-cuenta" className="underline underline-offset-4">
              Con una cuenta gratis tienes más
            </Link>{" "}
            y guardas tus proyectos.
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div
      role="status"
      className="border-border bg-card space-y-3 rounded-lg border p-4 text-sm"
    >
      <p className="font-medium">
        {anonymous
          ? `Ya usaste los ${limit} PDF gratis de hoy.`
          : `Ya usaste los ${limit} PDF de hoy.`}
      </p>
      <p className="text-muted-foreground">
        {anonymous
          ? `Crea una cuenta gratis para tener más PDF al día y guardar tus proyectos, o vuelve a partir de las ${renews}.`
          : `Se renuevan a las ${renews}. Mientras tanto puedes seguir preparando el tamaño y el recorte.`}
      </p>
      {anonymous ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/crear-cuenta">Crear cuenta gratis</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/acceder">Ya tengo cuenta</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
