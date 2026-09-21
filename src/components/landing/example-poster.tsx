import { posterLayout, posterSideForSheets } from "@/modules/posters/poster";
import type { PaperFormat } from "@/modules/printing/paper-format";
import { paperSize } from "@/modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";

/**
 * Un ejemplo con números de verdad.
 *
 * Las medidas y las hojas no están escritas a mano: salen del mismo módulo
 * de pósters que genera el PDF, así que la landing no puede prometer lo que
 * la herramienta no da. La figura es una ilustración; la retícula, el
 * reparto real.
 */
export function ExamplePoster({
  title,
  figure,
  sheetsWide,
  sheetsHigh,
  format,
}: {
  title: string;
  figure: "four" | "star" | "heart";
  sheetsWide: number;
  /**
   * Hojas justas también de alto: un ejemplo con la última fila casi vacía
   * enseñaría justo lo que la herramienta avisa que no se haga.
   */
  sheetsHigh: number;
  format: PaperFormat;
}) {
  const print: PrintConfiguration = {
    ...DEFAULT_PRINT_CONFIGURATION,
    paper: { ...DEFAULT_PRINT_CONFIGURATION.paper, format },
  };
  const poster = {
    width: posterSideForSheets(sheetsWide, "width", print),
    height: posterSideForSheets(sheetsHigh, "height", print),
  };
  const layout = posterLayout(poster, print);
  const sheet = paperSize(format, "PORTRAIT");
  const view = {
    width: Math.max(
      poster.width,
      ...layout.pages.map((p) => p.globalBounds.maxX),
    ),
    height: Math.max(
      poster.height,
      ...layout.pages.map((p) => p.globalBounds.maxY),
    ),
  };

  return (
    <figure className="border-border bg-card space-y-4 rounded-lg border p-5">
      <svg
        viewBox={`0 0 ${view.width} ${view.height}`}
        className="h-56 w-full"
        role="img"
        aria-label={`${title}: ${layout.pages.length} hojas ${format}`}
      >
        {layout.pages.map((page) => (
          <rect
            key={`paper-${page.id}`}
            x={page.globalBounds.minX}
            y={page.globalBounds.minY}
            width={page.globalBounds.maxX - page.globalBounds.minX}
            height={page.globalBounds.maxY - page.globalBounds.minY}
            fill="var(--background)"
          />
        ))}
        <Figure kind={figure} width={poster.width} height={poster.height} />
        {layout.pages.map((page) => (
          <rect
            key={`sheet-${page.id}`}
            x={page.globalBounds.minX}
            y={page.globalBounds.minY}
            width={page.globalBounds.maxX - page.globalBounds.minX}
            height={page.globalBounds.maxY - page.globalBounds.minY}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <figcaption className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">
          {centimeters(poster.width)} × {centimeters(poster.height)} cm ·{" "}
          {layout.columns} × {layout.rows} = {layout.pages.length} hojas{" "}
          {format === "LETTER" ? "Carta" : format} ({centimeters(sheet.width)} ×{" "}
          {centimeters(sheet.height)} cm)
        </p>
      </figcaption>
    </figure>
  );
}

function centimeters(millimeters: number): string {
  return (Math.round(millimeters) / 10).toLocaleString("es", {
    maximumFractionDigits: 1,
  });
}

/** Siluetas de ejemplo, dibujadas en el rectángulo del póster. */
function Figure({
  kind,
  width,
  height,
}: {
  kind: "four" | "star" | "heart";
  width: number;
  height: number;
}) {
  const w = width;
  const h = height;

  if (kind === "four") {
    return (
      <g>
        <rect width={w} height={h} fill="var(--illustration-1)" />
        <path
          d={fourPath(w, h)}
          fill="var(--illustration-2)"
          fillRule="evenodd"
        />
      </g>
    );
  }

  if (kind === "star") {
    const points = Array.from({ length: 10 }, (_unused, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 0.48 : 0.2;
      return `${w / 2 + Math.cos(angle) * r * w},${h * 0.53 + Math.sin(angle) * r * h}`;
    }).join(" ");

    return (
      <g>
        <rect width={w} height={h} fill="var(--illustration-3)" />
        <polygon points={points} fill="var(--illustration-4)" />
      </g>
    );
  }

  return (
    <g>
      <rect width={w} height={h} fill="var(--illustration-5)" />
      <path
        d={`M ${w / 2} ${h * 0.92} C ${w * 0.02} ${h * 0.6}, ${w * 0.04} ${h * 0.12}, ${w * 0.3} ${h * 0.1} C ${w * 0.42} ${h * 0.09}, ${w * 0.48} ${h * 0.18}, ${w / 2} ${h * 0.25} C ${w * 0.52} ${h * 0.18}, ${w * 0.58} ${h * 0.09}, ${w * 0.7} ${h * 0.1} C ${w * 0.96} ${h * 0.12}, ${w * 0.98} ${h * 0.6}, ${w / 2} ${h * 0.92} Z`}
        fill="var(--illustration-6)"
      />
    </g>
  );
}

/**
 * The example "4", as an SVG path filling a w x h box. Shared with the share
 * image (app/opengraph-image.tsx), so both show the same figure.
 */
export function fourPath(w: number, h: number): string {
  return `M ${w * 0.58} ${h * 0.06} L ${w * 0.78} ${h * 0.06} L ${w * 0.78} ${h * 0.6} L ${w * 0.9} ${h * 0.6} L ${w * 0.9} ${h * 0.74} L ${w * 0.78} ${h * 0.74} L ${w * 0.78} ${h * 0.94} L ${w * 0.58} ${h * 0.94} L ${w * 0.58} ${h * 0.74} L ${w * 0.1} ${h * 0.74} L ${w * 0.1} ${h * 0.6} Z M ${w * 0.58} ${h * 0.24} L ${w * 0.28} ${h * 0.6} L ${w * 0.58} ${h * 0.6} Z`;
}
