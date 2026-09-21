"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PercentCrop } from "react-image-crop";

import {
  ImageCropper,
  isWholeImage,
  toImageCrop,
  WHOLE_IMAGE,
} from "@/components/posters/image-cropper";
import type { PosterDownload } from "@/components/posters/poster-downloads";
import { PosterPreview } from "@/components/posters/poster-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageNotice } from "@/components/usage/usage-notice";
import {
  createImageCrop,
  CROP_MIN_SIDE,
  type ImageCrop,
  posterImagePlacement,
} from "@/modules/posters/crop";
import { InvalidImageCropError } from "@/modules/posters/errors";
import {
  type PosterJoining,
  posterPrintConfiguration,
} from "@/modules/posters/joining";
import {
  createPoster,
  lastSheetUsage,
  type Poster,
  POSTER_LIMITS,
  posterLayout,
  posterSideForSheets,
} from "@/modules/posters/poster";
import {
  largestSideForResolution,
  posterPixelsPerInch,
  posterSharpness,
  SHARPNESS_THRESHOLDS,
} from "@/modules/posters/resolution";
import {
  PAPER_FORMATS,
  type PaperFormat,
  type PaperOrientation,
} from "@/modules/printing/paper-format";
import type {
  PrintConfiguration,
  PrintLayout,
} from "@/modules/printing/print-layout";
import { useUsage } from "@/presentation/client/api/usage";
import { formatCentimeters } from "@/presentation/client/format";

/** Where the two ways of joining the sheets are explained. */
const JOINING_GUIDE_PATH = "/guias/como-imprimir-y-unir-las-hojas";

/** Qué lado fija el usuario, en centímetros. El otro sale de la imagen. */
type SizeChoice = { readonly axis: "width" | "height"; readonly cm: number };

/**
 * Tamaño, hojas y descarga del póster (docs/PRD.md §44).
 *
 * El usuario piensa en centímetros; las hojas se le enseñan al lado, al
 * momento. Como un par de centímetros de más cuestan una columna entera, los
 * botones de «hojas de ancho» dan las medidas que llenan hojas justas.
 *
 * Todo lo que se ve —tamaño, reparto, etiquetas— sale del mismo módulo de
 * pósters que usa el servidor para el PDF.
 */
export function PosterStudio({
  image,
  download,
  beforeDownload,
  downloadBlocked,
}: {
  /** `key` distingue una imagen de otra; `url` es lo que ve el navegador. */
  image: { readonly key: string; readonly url: string } | null;
  /** Qué hacer al descargar: guardar en el proyecto o no guardar nada. */
  download: PosterDownload;
  /** Shown next to the download, e.g. the terms box without an account. */
  beforeDownload?: React.ReactNode;
  /** Why the download cannot start yet; the buttons stay disabled. */
  downloadBlocked?: string | null;
}) {
  const [format, setFormat] = useState<PaperFormat>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("PORTRAIT");
  const [joining, setJoining] = useState<PosterJoining>("OVERLAP");
  const [choice, setChoice] = useState<SizeChoice | null>(null);
  // El recorte es de esta imagen: quien monta el componente lo reinicia al
  // cambiar de imagen (`key`).
  const [percentCrop, setPercentCrop] = useState<PercentCrop>(WHOLE_IMAGE);

  // The same configuration the server builds for this request, so the
  // sheets shown are the sheets printed (docs/pdf.md §99).
  const print: PrintConfiguration = useMemo(
    () => posterPrintConfiguration({ format, orientation }, joining),
    [format, orientation, joining],
  );

  // Solo hace falta la proporción: el navegador la sabe sin decodificar
  // nada a mano. El servidor la vuelve a leer del archivo al generar.
  const size = useQuery({
    queryKey: ["image-size", image?.key],
    enabled: image !== null,
    staleTime: Infinity,
    queryFn: () => naturalSize((image as { url: string }).url),
  });

  // Por defecto, tres hojas de ancho: una piñata mediana que no deja una
  // columna medio vacía.
  const effective: SizeChoice = choice ?? {
    axis: "width",
    cm: posterSideForSheets(3, "width", print) / 10,
  };

  const result = useMemo(():
    | {
        readonly poster: Poster;
        readonly layout: PrintLayout;
        /** Lo que se envía: nulo si es la imagen entera. */
        readonly crop: ImageCrop | null;
        /** La parte que se imprime, siempre. */
        readonly area: ImageCrop;
        readonly placement: ReturnType<typeof posterImagePlacement>;
      }
    | { readonly error: string }
    | null => {
    if (!size.data) {
      return null;
    }

    try {
      // Los mismos pasos que el servidor: el recorte manda sobre la
      // proporción, y la imagen entera se coloca para que lo llene.
      const crop = createImageCrop(
        size.data,
        toImageCrop(percentCrop, size.data),
      );
      const poster = createPoster(crop, {
        [effective.axis]: effective.cm * 10,
      } as { width: number } | { height: number });

      return {
        poster,
        layout: posterLayout(poster, print),
        crop: isWholeImage(percentCrop) ? null : crop,
        area: crop,
        placement: posterImagePlacement(poster, size.data, crop),
      };
    } catch (error) {
      return {
        error:
          error instanceof InvalidImageCropError
            ? `El recorte es demasiado pequeño: cada lado tiene que tener al menos ${CROP_MIN_SIDE} pixels de la imagen.`
            : `Cada lado tiene que medir entre ${POSTER_LIMITS.minSide / 10} cm y ${POSTER_LIMITS.maxSide / 10} cm.`,
      };
    }
  }, [size.data, percentCrop, effective.axis, effective.cm, print]);

  const ok = result !== null && "poster" in result ? result : null;
  const usage = useUsage();
  // Sin cupo no se deja empezar la descarga (PRD §39). Si el contador no
  // responde, no se bloquea: el servidor tiene la última palabra.
  const spent = usage.data?.remaining === 0;
  const ready = ok !== null && !spent;

  const canDownload =
    ready && image !== null && !download.busy && !downloadBlocked;
  const startDownload = () =>
    ok &&
    image &&
    download.run({
      [effective.axis]: effective.cm * 10,
      ...(ok.crop ? { crop: ok.crop } : {}),
      paper: { format, orientation },
      joining,
    });
  const downloadLabel = download.busy
    ? download.step
    : ok
      ? `Descargar PDF · ${ok.layout.pages.length} hojas`
      : "Descargar PDF";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-xl">Tamaño y hojas</h2>

        {/* On a phone the button lives in the floating bar below. */}
        <Button
          size="lg"
          className="hidden sm:inline-flex"
          disabled={!canDownload}
          onClick={startDownload}
        >
          {downloadLabel}
        </Button>
      </div>

      <UsageNotice />

      {image ? beforeDownload : null}

      {!image ? (
        <p className="text-muted-foreground text-sm">
          Sube una imagen para elegir el tamaño.
        </p>
      ) : null}

      {image && size.data ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Centimeters
              id="poster-width"
              label="Ancho (cm)"
              value={
                effective.axis === "width"
                  ? effective.cm
                  : ok
                    ? ok.poster.width / 10
                    : null
              }
              onChange={(cm) => setChoice({ axis: "width", cm })}
            />
            <Centimeters
              id="poster-height"
              label="Alto (cm)"
              value={
                effective.axis === "height"
                  ? effective.cm
                  : ok
                    ? ok.poster.height / 10
                    : null
              }
              onChange={(cm) => setChoice({ axis: "height", cm })}
            />

            <div className="space-y-2">
              <Label htmlFor="paper-format">Papel</Label>
              <select
                id="paper-format"
                className="border-input bg-card h-9 w-full rounded-md border px-3 text-sm"
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as PaperFormat)
                }
              >
                {PAPER_FORMATS.map((option) => (
                  <option key={option} value={option}>
                    {option === "LETTER" ? "Carta" : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paper-orientation">Orientación</Label>
              <select
                id="paper-orientation"
                className="border-input bg-card h-9 w-full rounded-md border px-3 text-sm"
                value={orientation}
                onChange={(event) =>
                  setOrientation(event.target.value as PaperOrientation)
                }
              >
                <option value="PORTRAIT">Vertical</option>
                <option value="LANDSCAPE">Horizontal</option>
              </select>
            </div>

            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="sheet-joining">Unión de las hojas</Label>
              <select
                id="sheet-joining"
                className="border-input bg-card h-9 w-full rounded-md border px-3 text-sm"
                value={joining}
                onChange={(event) =>
                  setJoining(event.target.value as PosterJoining)
                }
              >
                <option value="OVERLAP">Solapar 1 cm</option>
                <option value="TRIM">Sin solape</option>
              </select>
            </div>
          </div>

          {/* The explanation lives in the guide, with drawings (docs/pdf.md §99). */}
          <p className="text-muted-foreground text-xs">
            <Link
              href={`${JOINING_GUIDE_PATH}#solapar-o-sin-solape`}
              target="_blank"
              className="underline underline-offset-4"
            >
              ¿Solapar o sin solape? Cuál elegir
            </Link>
          </p>

          <SheetsWide
            print={print}
            current={ok ? ok.layout.columns : null}
            onPick={(cm) => setChoice({ axis: "width", cm })}
          />
        </>
      ) : null}

      {image && size.isPending ? (
        <Skeleton className="h-[32rem] w-full rounded-lg" />
      ) : null}

      {result && "error" in result ? (
        <p role="alert" className="text-destructive text-sm">
          {result.error}
        </p>
      ) : null}

      {ok && image ? (
        <Summary
          poster={ok.poster}
          layout={ok.layout}
          print={print}
          onFit={(cm) => setChoice({ axis: "width", cm })}
        />
      ) : null}

      {ok ? (
        <Sharpness
          poster={ok.poster}
          area={ok.area}
          print={print}
          onFit={(cm) => setChoice({ axis: "width", cm })}
        />
      ) : null}

      {image && size.data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">Recorte</h3>
            <ImageCropper
              imageUrl={image.url}
              crop={percentCrop}
              onChange={setPercentCrop}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Así se reparte en hojas</h3>
            {/* Alineado con el recortador, que lleva una fila de botones. */}
            <p className="text-muted-foreground flex min-h-8 items-center text-sm">
              Cada rectángulo es una hoja; se solapan en las juntas.
            </p>
            {ok ? (
              <PosterPreview
                poster={ok.poster}
                layout={ok.layout}
                imageUrl={image.url}
                placement={ok.placement}
              />
            ) : (
              <div className="border-border bg-card h-[32rem] rounded-lg border" />
            )}
          </div>
        </div>
      ) : null}

      {/*
        On a phone, cropping and choosing the size push the button off the
        screen: it floats at the bottom instead, always one tap away. The
        page makes room for it below the footer (app/layout.tsx), so it never
        covers the legal links.
      */}
      {image ? (
        <>
          <div
            data-floating-download
            className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden"
          >
            {downloadBlocked ? (
              <p className="text-muted-foreground mb-2 text-center text-xs">
                {downloadBlocked}
              </p>
            ) : ok ? (
              <p className="text-muted-foreground mb-2 text-center text-xs">
                {formatCentimeters(ok.poster.width)} ×{" "}
                {formatCentimeters(ok.poster.height)} cm · {ok.layout.columns} ×{" "}
                {ok.layout.rows} hojas
              </p>
            ) : null}
            <Button
              size="lg"
              className="w-full"
              disabled={!canDownload}
              onClick={startDownload}
            >
              {downloadLabel}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Summary({
  poster,
  layout,
  print,
  onFit,
}: {
  poster: Poster;
  layout: PrintLayout;
  print: PrintConfiguration;
  onFit: (cm: number) => void;
}) {
  const wasted = lastSheetUsage(poster, layout, "width") < 0.3;
  const fitting =
    layout.columns > 1
      ? posterSideForSheets(layout.columns - 1, "width", print) / 10
      : null;

  return (
    <div className="space-y-2 text-sm">
      <p>
        <strong>
          {formatCentimeters(poster.width)} × {formatCentimeters(poster.height)}{" "}
          cm
        </strong>{" "}
        · {layout.columns} de ancho × {layout.rows} de alto ={" "}
        <strong>{layout.pages.length} hojas</strong>, más la hoja de resumen con
        el mapa de montaje.
      </p>

      {/*
        Con solape, dos centímetros de más añaden una columna entera casi
        vacía. Se avisa y se ofrece la medida que cabe justa.
      */}
      {wasted && fitting && fitting * 10 >= POSTER_LIMITS.minSide ? (
        <p className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3">
          La última columna apenas se usa: es una hoja casi en blanco.
          <Button size="sm" variant="secondary" onClick={() => onFit(fitting)}>
            Usar {formatCentimeters(fitting * 10)} cm ({layout.columns - 1}{" "}
            hojas de ancho)
          </Button>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Cuánto detalle le queda a la imagen al ampliarla (docs/pdf.md §96).
 *
 * Se avisa y se propone la medida que conserva la nitidez, pero no se
 * impide: una piñata grande algo borrosa puede ser justo lo que se quiere.
 */
function Sharpness({
  poster,
  area,
  print,
  onFit,
}: {
  poster: Poster;
  area: ImageCrop;
  print: PrintConfiguration;
  onFit: (cm: number) => void;
}) {
  const pixelsPerInch = posterPixelsPerInch(poster, area);
  const sharpness = posterSharpness(pixelsPerInch);
  const rounded = Math.round(pixelsPerInch);

  if (sharpness === "SHARP") {
    return (
      <p className="text-muted-foreground text-sm">
        Nitidez buena: {rounded} pixels por pulgada.
      </p>
    );
  }

  const target =
    sharpness === "PIXELATED"
      ? SHARPNESS_THRESHOLDS.soft
      : SHARPNESS_THRESHOLDS.sharp;
  const fitting = wholeSheetsWithin(
    largestSideForResolution(area, target, "width"),
    print,
  );

  return (
    <p
      role={sharpness === "PIXELATED" ? "alert" : undefined}
      className={
        sharpness === "PIXELATED"
          ? "border-destructive/40 bg-card text-destructive flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
          : "border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
      }
    >
      {sharpness === "PIXELATED"
        ? `La imagen tiene poca resolución para este tamaño (${rounded} pixels por pulgada): se verán los cuadros incluso de lejos.`
        : `Se verá bien a un par de metros y algo borrosa de cerca (${rounded} pixels por pulgada).`}
      {fitting >= POSTER_LIMITS.minSide ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onFit(fitting / 10)}
        >
          {sharpness === "PIXELATED"
            ? `Usar ${formatCentimeters(fitting)} cm de ancho`
            : `Nítida hasta ${formatCentimeters(fitting)} cm de ancho`}
        </Button>
      ) : null}
    </p>
  );
}

/**
 * El ancho de hojas justas más grande que no pasa de `limit`.
 *
 * Proponer el límite tal cual dejaría casi siempre una columna medio vacía y
 * el aviso de al lado propondría otra medida. Si ni una hoja cabe, el límite.
 */
function wholeSheetsWithin(limit: number, print: PrintConfiguration): number {
  let best: number | null = null;

  for (let sheets = 1; ; sheets++) {
    const side = posterSideForSheets(sheets, "width", print);

    if (side > limit) {
      break;
    }

    best = side;
  }

  return best ?? limit;
}

/** Los anchos que llenan hojas justas, como botones. */
function SheetsWide({
  print,
  current,
  onPick,
}: {
  print: PrintConfiguration;
  current: number | null;
  onPick: (cm: number) => void;
}) {
  const options = [1, 2, 3, 4, 5, 6, 8]
    .map((sheets) => ({
      sheets,
      cm: posterSideForSheets(sheets, "width", print) / 10,
    }))
    .filter(
      ({ cm: value }) =>
        value * 10 >= POSTER_LIMITS.minSide &&
        value * 10 <= POSTER_LIMITS.maxSide,
    );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Hojas de ancho:</span>
      {options.map(({ sheets, cm: value }) => (
        <Button
          key={sheets}
          size="sm"
          variant={current === sheets ? "default" : "outline"}
          onClick={() => onPick(value)}
          title={`${formatCentimeters(value * 10)} cm de ancho`}
        >
          {sheets} · {formatCentimeters(value * 10)} cm
        </Button>
      ))}
    </div>
  );
}

function Centimeters({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (cm: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={POSTER_LIMITS.minSide / 10}
        max={POSTER_LIMITS.maxSide / 10}
        step={0.5}
        value={value === null ? "" : Math.round(value * 10) / 10}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  );
}

/** Tamaño natural de la imagen, tal y como la enseña el navegador. */
function naturalSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const probe = new Image();

    probe.onload = () =>
      resolve({ width: probe.naturalWidth, height: probe.naturalHeight });
    probe.onerror = () => reject(new Error("No pudimos leer la imagen."));
    probe.src = url;
  });
}
