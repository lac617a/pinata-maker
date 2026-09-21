"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateExport } from "@/presentation/client/api/exports";
import type { TemplateVersionSummary } from "@/presentation/client/api/templates";
import { formatDate, formatMillimeters } from "@/presentation/client/format";

/**
 * Las versiones publicadas del proyecto.
 *
 * Cada una es inmutable: la de ayer sigue diciendo lo mismo aunque hoy se
 * publique otra, que es lo que permite reimprimir un molde ya recortado
 * (docs/storage.md §155).
 */
export function TemplateVersions({
  projectId,
  versions,
  isPending,
}: {
  projectId: string;
  versions: TemplateVersionSummary[] | undefined;
  isPending: boolean;
}) {
  const createExport = useCreateExport(projectId);

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl">Versiones</h2>

      {isPending ? <Skeleton className="h-16 w-full rounded-lg" /> : null}

      {versions?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no has publicado ninguna. Calcula el molde y publícalo para
          poder generar el PDF.
        </p>
      ) : null}

      <ul className="space-y-3">
        {versions?.map((version) => (
          <li
            key={version.id}
            className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
          >
            <div className="min-w-48 flex-1">
              <p className="font-medium">
                v{version.versionNumber} · {version.pieceCount} piezas
              </p>
              <p className="text-muted-foreground text-sm">
                {formatMillimeters(version.width)} ×{" "}
                {formatMillimeters(version.height)} ×{" "}
                {formatMillimeters(version.depth)} ·{" "}
                {formatDate(version.createdAt)}
              </p>
            </div>

            <Button
              size="sm"
              disabled={createExport.isPending}
              onClick={() =>
                createExport.mutate(
                  { templateVersionId: version.id },
                  {
                    onSuccess: (generated) =>
                      toast.success(
                        `PDF generado: ${generated.pageCount} hojas.`,
                      ),
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            >
              {createExport.isPending ? "Generando…" : "Generar PDF"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
