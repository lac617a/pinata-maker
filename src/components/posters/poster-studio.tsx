"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { PercentCrop } from "react-image-crop";
import { toast } from "sonner";

import {
  ImageCropper,
  isWholeImage,
  toImageCrop,
  WHOLE_IMAGE,
} from "@/components/posters/image-cropper";
import { PosterPreview } from "@/components/posters/poster-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createImageCrop,
  CROP_MIN_SIDE,
  type ImageCrop,
  posterImagePlacement,
} from "@/modules/posters/crop";
import { InvalidImageCropError } from "@/modules/posters/errors";
import {
  createPoster,
  lastSheetUsage,
  type Poster,
  POSTER_LIMITS,
  posterLayout,
  posterSideForSheets,
} from "@/modules/posters/poster";
import {
  PAPER_FORMATS,
  type PaperFormat,
  type PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
  type PrintLayout,
} from "@/modules/printing/print-layout";
import {
  useDownloadExport,
  useExportPoster,
} from "@/presentation/client/api/exports";
import type { ProjectImage } from "@/presentation/client/api/images";
import { formatCentimeters } from "@/presentation/client/format";

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
  projectId,
  image,
}: {
  projectId: string;
  image: ProjectImage | null;
}) {
  const [format, setFormat] = useState<PaperFormat>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("PORTRAIT");
  const [choice, setChoice] = useState<SizeChoice | null>(null);
  // El recorte es de esta imagen: quien monta el componente lo reinicia al
  // cambiar de imagen (`key`).
  const [percentCrop, setPercentCrop] = useState<PercentCrop>(WHOLE_IMAGE);

  const print: PrintConfiguration = useMemo(
    () => ({
      ...DEFAULT_PRINT_CONFIGURATION,
      paper: { ...DEFAULT_PRINT_CONFIGURATION.paper, format, orientation },
    }),
    [format, orientation],
  );

  // Solo hace falta la proporción: el navegador la sabe sin decodificar
  // nada a mano. El servidor la vuelve a leer del archivo al generar.
  const size = useQuery({
    queryKey: ["image-size", image?.id],
    enabled: image !== null,
    staleTime: Infinity,
    queryFn: () => naturalSize((image as ProjectImage).url),
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
        readonly crop: ImageCrop | null;
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
  const ready = ok !== null;
  const download = useOneClickPoster(projectId);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-xl">Tamaño y hojas</h2>

        <Button
          size="lg"
          disabled={!ready || !image || download.busy}
          onClick={() =>
            ok &&
            image &&
            download.run({
              assetId: image.id,
              [effective.axis]: effective.cm * 10,
              ...(ok.crop ? { crop: ok.crop } : {}),
              paper: { format, orientation },
            })
          }
        >
          {download.busy
            ? download.step
            : ok
              ? `Descargar PDF · ${ok.layout.pages.length} hojas`
              : "Descargar PDF"}
        </Button>
      </div>

      {!image ? (
        <p className="text-muted-foreground text-sm">
          Sube una imagen para elegir el tamaño.
        </p>
      ) : null}

      {image && size.data ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          </div>

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

/**
 * Genera el póster y lo descarga.
 *
 * El enlace lleva el nombre del archivo y descarga sin abrir otra pestaña:
 * nada que el navegador pueda bloquear después de esperar al PDF.
 */
function useOneClickPoster(projectId: string) {
  const generate = useExportPoster(projectId);
  const download = useDownloadExport();
  const [step, setStep] = useState<string | null>(null);

  async function run(input: Parameters<typeof generate.mutateAsync>[0]) {
    try {
      setStep("Generando PDF…");
      const generated = await generate.mutateAsync(input);

      setStep("Preparando la descarga…");
      const ready = await download.mutateAsync(generated.id);

      window.location.assign(ready.url);
      toast.success(`${generated.fileName}: ${generated.pageCount} hojas.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No pudimos generar el PDF.",
      );
    } finally {
      setStep(null);
    }
  }

  return { run, busy: step !== null, step: step ?? "" };
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
