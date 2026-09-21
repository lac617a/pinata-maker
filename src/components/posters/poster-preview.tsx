"use client";

import type { Poster } from "@/modules/posters/poster";
import type { PrintLayout } from "@/modules/printing/print-layout";

/**
 * El póster con la retícula de hojas encima.
 *
 * Es el mismo mapa que la hoja de resumen del PDF (docs/pdf.md §94): las
 * regiones salen del mismo reparto, así que la etiqueta que se ve aquí es la
 * que lleva el pie de cada hoja impresa. Donde dos hojas se solapan las
 * líneas salen dobles: ese trozo de imagen se imprime en las dos.
 */
export function PosterPreview({
  poster,
  layout,
  imageUrl,
}: {
  poster: Poster;
  layout: PrintLayout;
  imageUrl: string;
}) {
  // La vista cubre también lo que las hojas imprimen de más: la última
  // columna o fila puede quedar parcialmente en blanco.
  const last = layout.pages[layout.pages.length - 1].globalBounds;
  const viewWidth = Math.max(poster.width, last.maxX);
  const viewHeight = Math.max(poster.height, last.maxY);
  const label = Math.min(viewWidth, viewHeight) * 0.035;

  return (
    <svg
      role="img"
      aria-label={`Póster en ${layout.pages.length} hojas`}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="border-border bg-card h-[32rem] w-full rounded-lg border"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* El papel: lo que se imprime aunque la imagen no llegue. */}
      {layout.pages.map((page) => (
        <rect
          key={`paper-${page.id}`}
          x={page.globalBounds.minX}
          y={page.globalBounds.minY}
          width={page.globalBounds.maxX - page.globalBounds.minX}
          height={page.globalBounds.maxY - page.globalBounds.minY}
          // Con variable y no con clase: sin relleno declarado, SVG pinta de
          // negro y la hoja taparía la figura.
          fill="var(--background)"
        />
      ))}

      <image
        href={imageUrl}
        x={0}
        y={0}
        width={poster.width}
        height={poster.height}
        preserveAspectRatio="none"
      />

      {/* Solape: la franja que cada hoja repite de la vecina. */}
      {layout.pages.map((page) => (
        <rect
          key={`sheet-${page.id}`}
          x={page.globalBounds.minX}
          y={page.globalBounds.minY}
          width={page.globalBounds.maxX - page.globalBounds.minX}
          height={page.globalBounds.maxY - page.globalBounds.minY}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {layout.pages.map((page) => (
        <text
          key={`label-${page.id}`}
          x={(page.globalBounds.minX + page.globalBounds.maxX) / 2}
          y={(page.globalBounds.minY + page.globalBounds.maxY) / 2}
          fontSize={label}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-mono font-bold"
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth={label * 0.12}
          paintOrder="stroke"
        >
          {page.id}
        </text>
      ))}
    </svg>
  );
}
