"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { countPrintableSheets } from "@/application/generate-printable-document";
import {
  generateTemplate,
  type GenerateTemplateResult,
  type TemplateWarning,
} from "@/application/generate-template";
import { TemplatePreview } from "@/components/templates/template-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { maskIsFullyOpaque } from "@/modules/image-processing/rgba-mask";
import {
  PAPER_FORMATS,
  type PaperFormat,
  type PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";
import { serializeTemplate } from "@/modules/templates/template-definition";
import {
  useCreateExport,
  useDownloadExport,
} from "@/presentation/client/api/exports";
import type { ProjectImage } from "@/presentation/client/api/images";
import { usePublishTemplateVersion } from "@/presentation/client/api/templates";
import {
  formatMillimeters,
  formatSquareMillimeters,
} from "@/presentation/client/format";
import { readAlphaMask } from "@/presentation/client/image-decoding";
import { messageForErrorCode } from "@/presentation/http/error-response";

type Settings = {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly format: PaperFormat;
  readonly orientation: PaperOrientation;
};

const INITIAL_SETTINGS: Settings = {
  width: 600,
  height: 800,
  depth: 150,
  format: "A4",
  orientation: "PORTRAIT",
};

/**
 * Del dibujo al PDF en un solo paso.
 *
 * El molde se recalcula solo al cambiar la imagen o una medida, y se enseña
 * entero antes de descargar: piezas, hojas y la figura recortada. Descargar
 * publica la versión, genera el documento y lo baja; el usuario no tiene que
 * saber que son tres operaciones.
 *
 * La derivación ocurre en el navegador mientras no exista la eliminación de
 * fondo (docs/roadmap.md §2.15). El PDF sale del servidor, desde la versión
 * guardada.
 */
export function TemplateStudio({
  projectId,
  projectName,
  image,
}: {
  projectId: string;
  projectName: string;
  image: ProjectImage | null;
}) {
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const settled = useSettled(settings, 350);

  const print: PrintConfiguration = useMemo(
    () => ({
      ...DEFAULT_PRINT_CONFIGURATION,
      paper: {
        ...DEFAULT_PRINT_CONFIGURATION.paper,
        format: settled.format,
        orientation: settled.orientation,
      },
    }),
    [settled.format, settled.orientation],
  );

  // La imagen se decodifica una vez por imagen, no cada vez que cambia una
  // medida: es lo caro, y no depende de ellas.
  const mask = useQuery({
    queryKey: ["mask", image?.id],
    enabled: image !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const response = await fetch((image as ProjectImage).url);

      if (!response.ok) {
        throw new Error("No pudimos leer la imagen guardada.");
      }

      return readAlphaMask(await response.blob());
    },
  });

  const derivation = useMemo(():
    | { readonly result: GenerateTemplateResult; readonly sheets: number }
    | { readonly error: string }
    | null => {
    if (!mask.data) {
      return null;
    }

    const measures = [settled.width, settled.height, settled.depth];

    if (!measures.every((value) => Number.isFinite(value) && value > 0)) {
      return {
        error: "Las medidas tienen que ser números mayores que cero.",
      };
    }

    try {
      const result = generateTemplate({
        mask: mask.data,
        dimensions: { width: settled.width, height: settled.height },
        depth: settled.depth,
        name: projectName,
        paper: print.paper,
      });

      return { result, sheets: countPrintableSheets(result.template, print) };
    } catch (error) {
      return { error: describe(error) };
    }
  }, [mask.data, settled, projectName, print]);

  const opaque = useMemo(
    () => (mask.data ? maskIsFullyOpaque(mask.data) : false),
    [mask.data],
  );

  const download = useOneClickDownload(projectId);

  const ready = derivation !== null && "result" in derivation;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-serif text-xl">Molde</h2>

        <Button
          size="lg"
          disabled={!ready || download.busy}
          onClick={() =>
            ready &&
            image &&
            download.run({
              result: derivation.result,
              imageId: image.id,
              settings: settled,
            })
          }
        >
          {download.busy
            ? download.step
            : ready
              ? `Descargar PDF · ${derivation.sheets} hojas`
              : "Descargar PDF"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Measurement
          id="width"
          label="Ancho (mm)"
          value={settings.width}
          onChange={(width) => setSettings({ ...settings, width })}
        />
        <Measurement
          id="height"
          label="Alto (mm)"
          value={settings.height}
          onChange={(height) => setSettings({ ...settings, height })}
        />
        <Measurement
          id="depth"
          label="Profundidad (mm)"
          value={settings.depth}
          onChange={(depth) => setSettings({ ...settings, depth })}
        />

        <div className="space-y-2">
          <Label htmlFor="paper-format">Papel</Label>
          <select
            id="paper-format"
            className="border-input bg-card h-9 w-full rounded-md border px-3 text-sm"
            value={settings.format}
            onChange={(event) =>
              setSettings({
                ...settings,
                format: event.target.value as PaperFormat,
              })
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
            value={settings.orientation}
            onChange={(event) =>
              setSettings({
                ...settings,
                orientation: event.target.value as PaperOrientation,
              })
            }
          >
            <option value="PORTRAIT">Vertical</option>
            <option value="LANDSCAPE">Horizontal</option>
          </select>
        </div>
      </div>

      {!image ? (
        <p className="text-muted-foreground text-sm">
          Sube una imagen para ver el molde.
        </p>
      ) : null}

      {mask.isPending && image ? (
        <Skeleton className="h-80 w-full rounded-lg" />
      ) : null}

      {mask.error ? (
        <p role="alert" className="text-destructive text-sm">
          {describe(mask.error)}
        </p>
      ) : null}

      {derivation && "error" in derivation ? (
        <p role="alert" className="text-destructive text-sm">
          {derivation.error}
        </p>
      ) : null}

      {opaque ? (
        <p className="border-border bg-card rounded-lg border p-3 text-sm">
          Esta imagen no tiene fondo transparente, así que el molde toma la
          forma del rectángulo completo. Para que siga el contorno del
          personaje, sube un PNG con el fondo ya recortado.
        </p>
      ) : null}

      {ready ? (
        <>
          <Summary result={derivation.result} sheets={derivation.sheets} />
          <TemplatePreview
            template={derivation.result.template}
            print={print}
            imageUrl={image?.url ?? null}
          />
        </>
      ) : null}
    </section>
  );
}

function Summary({
  result,
  sheets,
}: {
  result: GenerateTemplateResult;
  sheets: number;
}) {
  const { template, footprint, warnings } = result;

  return (
    <div className="space-y-1 text-sm">
      <p>
        <strong>
          {formatMillimeters(template.width)} ×{" "}
          {formatMillimeters(template.height)} ×{" "}
          {formatMillimeters(template.depth)}
        </strong>{" "}
        · {footprint.pieceCount} piezas · {sheets} hojas, incluida la de
        instrucciones · {formatSquareMillimeters(footprint.totalArea)} de papel
      </p>

      {warnings.map((warning) => (
        <p key={warning.code} className="text-muted-foreground">
          {describeWarning(warning)}
        </p>
      ))}
    </div>
  );
}

/**
 * Publica, genera y descarga, en ese orden.
 *
 * Si con estas mismas medidas e imagen ya se publicó una versión en esta
 * visita, se reutiliza: una versión es inmutable y publicar dos veces lo
 * mismo solo llenaría el historial.
 */
function useOneClickDownload(projectId: string) {
  const publish = usePublishTemplateVersion(projectId);
  const createExport = useCreateExport(projectId);
  const downloadExport = useDownloadExport();

  const published = useRef(new Map<string, string>());
  const [step, setStep] = useState<string | null>(null);

  async function run(input: {
    result: GenerateTemplateResult;
    imageId: string;
    settings: Settings;
  }) {
    const signature = JSON.stringify([input.imageId, input.settings]);

    try {
      let versionId = published.current.get(signature);

      if (!versionId) {
        setStep("Guardando versión…");

        // Sin `expectedVersionNumber`: aquí se publica lo que el usuario
        // está viendo, y un 409 por otra pestaña solo añadiría fricción. La
        // protección sigue disponible para un editor que la necesite.
        // Ver docs/storage.md §156.
        const version = await publish.mutateAsync({
          template: serializeTemplate(input.result.template),
          sourceAssetId: input.imageId,
        });

        versionId = version.id;
        published.current.set(signature, versionId);
      }

      setStep("Generando PDF…");

      const generated = await createExport.mutateAsync({
        templateVersionId: versionId,
        paper: {
          format: input.settings.format,
          orientation: input.settings.orientation,
        },
      });

      const ready = await downloadExport.mutateAsync(generated.id);

      // El enlace lleva el nombre del archivo y se descarga sin abrir otra
      // pestaña: nada que el navegador pueda bloquear.
      window.location.assign(ready.url);
      toast.success(`${generated.fileName}: ${generated.pageCount} hojas.`);
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setStep(null);
    }
  }

  return { run, busy: step !== null, step: step ?? "" };
}

/** El último valor tras un rato sin cambios: no recalcular a cada tecla. */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

function Measurement({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  );
}

/** Los avisos del dominio, dichos para quien va a recortar. */
function describeWarning(warning: TemplateWarning): string {
  switch (warning.code) {
    case "OTHER_FIGURES_DISCARDED":
      return `La imagen tenía ${warning.count} figura(s) más pequeñas y se han descartado.`;
    case "EXACT_SIZE_NEEDS_DISTORTION":
      return "Para no deformar la figura se ha mantenido su proporción, así que una de las dos medidas sale menor que la pedida.";
    case "DETAIL_LIMITED_BY_RESOLUTION":
      return `El detalle está limitado por la resolución de la imagen: tolerancia de ${formatMillimeters(warning.appliedTolerance)}.`;
  }
}

/**
 * El error del dominio, dicho en el idioma del usuario.
 *
 * La derivación no pasa por HTTP, así que se busca el mismo código en la
 * misma tabla que usa la API.
 */
function describe(error: unknown): string {
  const code =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown }).code
      : undefined;

  return (
    messageForErrorCode(typeof code === "string" ? code : undefined) ??
    (error instanceof Error
      ? error.message
      : "No pudimos calcular el molde con esta imagen.")
  );
}
