"use client";

import { useId } from "react";

import {
  type BoundingBox,
  boundingBoxFromPoints,
} from "@/modules/geometry/bounding-box";
import type { Polygon } from "@/modules/geometry/polygon";
import { templateGeometryBounds } from "@/modules/geometry/template-geometry";
import {
  createPrintLayout,
  type PrintConfiguration,
  type PrintLayout,
} from "@/modules/printing/print-layout";
import {
  referenceImageOnFace,
  type ReferenceImagePlacement,
  type Template,
  type TemplatePiece,
} from "@/modules/templates/template";
import { formatMillimeters } from "@/presentation/client/format";

/**
 * Vista previa de la plantilla: cada pieza, con la figura dentro y la
 * retícula de hojas encima.
 *
 * Es orientativa, no la fuente de verdad física (docs/printing.md §78): el
 * PDF sale del servidor desde la versión guardada. Lo que sí es exacto es el
 * reparto, porque usa el mismo `createPrintLayout` que el documento: las
 * hojas y sus etiquetas son las que se van a imprimir. Ver docs/PRD.md §20.
 */
export function TemplatePreview({
  template,
  print,
  imageUrl,
}: {
  template: Template;
  print: PrintConfiguration;
  imageUrl: string | null;
}) {
  const pieces = template.pieces.map((piece) => ({
    piece,
    layout: createPrintLayout(piece.geometry, print),
  }));

  const faces = pieces.filter(({ piece }) => piece.role !== "SIDE");
  const sides = pieces.filter(({ piece }) => piece.role === "SIDE");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {faces.map(({ piece, layout }) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            layout={layout}
            image={imageOn(template, piece, imageUrl)}
            className="h-80"
          />
        ))}
      </div>

      {sides.length > 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Tira lateral en {sides.length} piezas, en el orden en que se pegan
            alrededor de la figura.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {sides.map(({ piece, layout }) => (
              <PieceCard
                key={piece.id}
                piece={piece}
                layout={layout}
                image={null}
                className="h-40"
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type PieceImage = {
  readonly url: string;
  readonly placement: ReferenceImagePlacement;
  /** La espalda lleva la imagen volteada, no solo desplazada. */
  readonly mirrored: boolean;
};

/** La misma regla que usa el PDF: `referenceImageOnFace` del dominio. */
function imageOn(
  template: Template,
  piece: TemplatePiece,
  url: string | null,
): PieceImage | null {
  const onFace = url ? referenceImageOnFace(template, piece) : null;

  return url && onFace ? { url, ...onFace } : null;
}

function PieceCard({
  piece,
  layout,
  image,
  className,
  compact = false,
}: {
  piece: TemplatePiece;
  layout: PrintLayout;
  image: PieceImage | null;
  className: string;
  compact?: boolean;
}) {
  const clipId = useId();
  const bounds = templateGeometryBounds(piece.geometry);

  // Las hojas cubren algo más que la pieza: la vista enseña las dos cosas.
  const view = unionBounds([
    bounds,
    ...layout.pages.map((page) => page.globalBounds),
  ]);
  const padding = Math.max(view.maxX - view.minX, view.maxY - view.minY) * 0.02;

  const label = Math.min(
    ...layout.pages.map((page) =>
      Math.min(
        page.globalBounds.maxX - page.globalBounds.minX,
        page.globalBounds.maxY - page.globalBounds.minY,
      ),
    ),
  );

  return (
    <figure className="border-border bg-card space-y-2 rounded-lg border p-3">
      <svg
        role="img"
        aria-label={`${pieceName(piece)}: ${layout.pages.length} hojas`}
        className={`w-full ${className}`}
        viewBox={`${view.minX - padding} ${view.minY - padding} ${
          view.maxX - view.minX + padding * 2
        } ${view.maxY - view.minY + padding * 2}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {piece.geometry.outerContours.map((contour, index) => (
              <path key={index} d={pathOf(contour)} />
            ))}
          </clipPath>
        </defs>

        {/* Papel: cada hoja que se va a imprimir, con su etiqueta. */}
        {layout.pages.map((page) => (
          <g key={page.id}>
            <rect
              x={page.globalBounds.minX}
              y={page.globalBounds.minY}
              width={page.globalBounds.maxX - page.globalBounds.minX}
              height={page.globalBounds.maxY - page.globalBounds.minY}
              className="fill-background stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {compact ? null : (
              <text
                x={page.globalBounds.minX + label * 0.06}
                y={page.globalBounds.minY + label * 0.12}
                fontSize={label * 0.08}
                className="fill-muted-foreground font-mono"
              >
                {page.id}
              </text>
            )}
          </g>
        ))}

        {/* La figura, recortada por la silueta de la pieza. */}
        {image ? (
          <g clipPath={`url(#${clipId})`}>
            <g
              transform={
                image.mirrored
                  ? // Voltea la imagen sobre su propio eje vertical: el
                    // rectángulo ya viene reflejado por el dominio.
                    `translate(${2 * image.placement.x + image.placement.width} 0) scale(-1 1)`
                  : undefined
              }
            >
              <image
                href={image.url}
                x={image.placement.x}
                y={image.placement.y}
                width={image.placement.width}
                height={image.placement.height}
                preserveAspectRatio="none"
              />
            </g>
          </g>
        ) : null}

        {piece.geometry.outerContours.map((contour, index) => (
          <path
            key={`outer-${index}`}
            d={pathOf(contour)}
            className="stroke-foreground fill-none"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {piece.geometry.cutLines.map((line, index) => (
          <path
            key={`cut-${index}`}
            d={pathOf(line.geometry)}
            className="stroke-foreground fill-none"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Los pliegues con otro trazo, como en el PDF: doblar no es cortar. */}
        {piece.geometry.foldLines.map((line, index) => (
          <path
            key={`fold-${index}`}
            d={pathOf(line.geometry)}
            className="stroke-muted-foreground fill-none"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">{pieceName(piece)}</span>
        <span className="text-muted-foreground shrink-0">
          {layout.pages.length} {layout.pages.length === 1 ? "hoja" : "hojas"}
          {compact
            ? null
            : ` · ${formatMillimeters(bounds.maxX - bounds.minX)} × ${formatMillimeters(bounds.maxY - bounds.minY)}`}
        </span>
      </figcaption>
    </figure>
  );
}

function pieceName(piece: TemplatePiece): string {
  if (piece.role === "FRONT") {
    return "Frente";
  }

  if (piece.role === "BACK") {
    return "Espalda (reflejada)";
  }

  return `Lateral ${piece.id.replace(/^SIDE-/, "")}`;
}

function pathOf(polygon: Polygon): string {
  const [first, ...rest] = polygon.points;

  return (
    `M ${first.x} ${first.y} ` +
    rest.map((point) => `L ${point.x} ${point.y}`).join(" ") +
    (polygon.closed ? " Z" : "")
  );
}

function unionBounds(boxes: readonly BoundingBox[]): BoundingBox {
  return boundingBoxFromPoints(
    boxes.flatMap((box) => [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.maxY },
    ]),
  );
}
