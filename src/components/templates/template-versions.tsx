"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { TemplateVersionSummary } from "@/presentation/client/api/templates";
import { formatDate, formatMillimeters } from "@/presentation/client/format";

/**
 * Las versiones publicadas del proyecto.
 *
 * Solo lectura: una versión nace al descargar su PDF desde el molde. Cada una
 * es inmutable, así que la de ayer sigue diciendo lo mismo aunque hoy se
 * publique otra (docs/storage.md §155).
 */
export function TemplateVersions({
  versions,
  isPending,
}: {
  versions: TemplateVersionSummary[] | undefined;
  isPending: boolean;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium">Versiones</h3>

      {isPending ? <Skeleton className="h-12 w-full rounded-lg" /> : null}

      {versions?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Se guarda una cada vez que descargas un PDF con medidas nuevas.
        </p>
      ) : null}

      <ul className="space-y-2">
        {versions?.map((version) => (
          <li
            key={version.id}
            className="border-border bg-card rounded-lg border px-4 py-3 text-sm"
          >
            <span className="font-medium">v{version.versionNumber}</span>
            <span className="text-muted-foreground">
              {" "}
              · {version.pieceCount} piezas · {formatMillimeters(version.width)}{" "}
              × {formatMillimeters(version.height)} ×{" "}
              {formatMillimeters(version.depth)} ·{" "}
              {formatDate(version.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
