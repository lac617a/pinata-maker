"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteExport,
  useDownloadExport,
  useProjectExports,
} from "@/presentation/client/api/exports";
import { formatBytes, formatDate } from "@/presentation/client/format";

/**
 * Los documentos ya generados.
 *
 * El PDF no se vuelve a generar al descargarlo: el archivo guardado es el que
 * el usuario imprimió, y regenerarlo con otro generador daría otro documento
 * (docs/storage.md §162).
 */
export function ProjectExports({ projectId }: { projectId: string }) {
  const exports = useProjectExports(projectId);
  const download = useDownloadExport();
  const remove = useDeleteExport(projectId);
  const [downloading, setDownloading] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Documentos generados</h3>

      {exports.isPending ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : null}

      {exports.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aquí aparecerán los PDF que generes desde una versión.
        </p>
      ) : null}

      <ul className="space-y-3">
        {exports.data?.map((generated) => (
          <li
            key={generated.id}
            className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4"
          >
            <div className="min-w-48 flex-1">
              <p className="font-medium">{generated.fileName}</p>
              <p className="text-muted-foreground text-sm">
                {generated.pageCount} hojas · {generated.paperFormat} ·{" "}
                {formatBytes(generated.byteSize)} ·{" "}
                {formatDate(generated.createdAt)}
              </p>
            </div>

            <Button
              size="sm"
              disabled={downloading === generated.id}
              onClick={() => {
                setDownloading(generated.id);

                download.mutate(generated.id, {
                  onSuccess: (ready) => {
                    // El enlace es firmado, caduca y lleva el nombre del
                    // archivo: se pide al descargar y descarga sin abrir otra
                    // pestaña que el navegador pueda bloquear.
                    window.location.assign(ready.url);
                  },
                  onError: (error) => toast.error(error.message),
                  onSettled: () => setDownloading(null),
                });
              }}
            >
              Descargar
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(generated.id, {
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              Borrar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
