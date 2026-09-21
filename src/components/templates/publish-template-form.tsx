"use client";

import { useState } from "react";
import { toast } from "sonner";

import { countPrintableSheets } from "@/application/generate-printable-document";
import {
  generateTemplate,
  type TemplateWarning,
} from "@/application/generate-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskIsFullyOpaque } from "@/modules/image-processing/rgba-mask";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import { PAPER_FORMATS } from "@/modules/printing/paper-format";
import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";
import type { Template } from "@/modules/templates/template";
import type { TemplateFootprint } from "@/modules/templates/template";
import { serializeTemplate } from "@/modules/templates/template-definition";
import type { ProjectImage } from "@/presentation/client/api/images";
import { usePublishTemplateVersion } from "@/presentation/client/api/templates";
import {
  formatMillimeters,
  formatSquareMillimeters,
} from "@/presentation/client/format";
import { readAlphaMask } from "@/presentation/client/image-decoding";
import { messageForErrorCode } from "@/presentation/http/error-response";

/**
 * Deriva la plantilla y la publica como versión.
 *
 * **La derivación ocurre en el navegador.** El dominio es TypeScript puro y
 * el navegador ya trae un decodificador de imágenes, así que un PNG con
 * transparencia puede convertirse en molde hoy, sin esperar a la eliminación
 * de fondo. Es el borrador de docs/storage.md §18: publicar lo fija, y lo
 * que se guarda pasa por los constructores del dominio en el servidor
 * (§158).
 *
 * El cálculo se enseña **antes** de publicar: cuarenta hojas de papel son
 * una decisión del usuario, no una sorpresa (docs/template.md §120).
 */
export function PublishTemplateForm({
  projectId,
  projectName,
  image,
  latestVersionNumber,
}: {
  projectId: string;
  projectName: string;
  image: ProjectImage | null;
  latestVersionNumber: number;
}) {
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(800);
  const [depth, setDepth] = useState(150);
  const [format, setFormat] = useState<PaperFormat>("A4");
  const [orientation, setOrientation] = useState<PaperOrientation>("PORTRAIT");

  const [deriving, setDeriving] = useState(false);
  const [derived, setDerived] = useState<DerivedTemplate | null>(null);

  const publish = usePublishTemplateVersion(projectId);

  const paper = {
    ...DEFAULT_PRINT_CONFIGURATION.paper,
    format,
    orientation,
  };

  async function derive() {
    if (!image) {
      toast.error("Elige antes una imagen del proyecto.");

      return;
    }

    setDeriving(true);
    setDerived(null);

    try {
      const response = await fetch(image.url);

      if (!response.ok) {
        throw new Error("No pudimos leer la imagen guardada.");
      }

      const mask = await readAlphaMask(await response.blob());

      if (maskIsFullyOpaque(mask)) {
        toast.warning(
          "Esta imagen no tiene transparencia: el molde saldrá con la forma del rectángulo completo.",
        );
      }

      const result = generateTemplate({
        mask,
        dimensions: { width, height },
        depth,
        name: projectName,
        paper,
      });

      setDerived({
        template: result.template,
        footprint: result.footprint,
        warnings: result.warnings,
        sheets: countPrintableSheets(result.template, {
          ...DEFAULT_PRINT_CONFIGURATION,
          paper,
        }),
      });
    } catch (error) {
      toast.error(describe(error));
    } finally {
      setDeriving(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl">Molde</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Measurement label="Ancho (mm)" value={width} onChange={setWidth} />
        <Measurement label="Alto (mm)" value={height} onChange={setHeight} />
        <Measurement
          label="Profundidad (mm)"
          value={depth}
          onChange={setDepth}
        />

        <div className="space-y-2">
          <Label htmlFor="paper-format">Papel</Label>
          <select
            id="paper-format"
            className="border-input bg-card h-9 w-full rounded-md border px-3 text-sm"
            value={format}
            onChange={(event) => setFormat(event.target.value as PaperFormat)}
          >
            {PAPER_FORMATS.map((option) => (
              <option key={option} value={option}>
                {option}
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

      <div className="flex flex-wrap gap-3">
        <Button onClick={derive} disabled={deriving || !image}>
          {deriving ? "Calculando…" : "Calcular molde"}
        </Button>

        {derived ? (
          <Button
            variant="secondary"
            disabled={publish.isPending}
            onClick={() =>
              publish.mutate(
                {
                  template: serializeTemplate(derived.template),
                  sourceAssetId: image?.id ?? null,
                  expectedVersionNumber: latestVersionNumber,
                },
                {
                  onSuccess: (version) => {
                    setDerived(null);
                    toast.success(
                      `Publicada la versión ${version.versionNumber}.`,
                    );
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          >
            Publicar versión
          </Button>
        ) : null}
      </div>

      {derived ? <Summary derived={derived} /> : null}
    </section>
  );
}

type DerivedTemplate = {
  readonly template: Template;
  readonly footprint: TemplateFootprint;
  readonly warnings: readonly TemplateWarning[];
  readonly sheets: number;
};

function Summary({ derived }: { derived: DerivedTemplate }) {
  return (
    <div className="border-border bg-card space-y-2 rounded-lg border p-4 text-sm">
      <p>
        <strong>{derived.footprint.pieceCount} piezas</strong> ·{" "}
        {formatSquareMillimeters(derived.footprint.totalArea)} de papel ·{" "}
        {derived.sheets} hojas, incluida la de instrucciones.
      </p>
      <p className="text-muted-foreground">
        La pieza más grande es {derived.footprint.largestPiece.id}, de{" "}
        {formatSquareMillimeters(derived.footprint.largestPiece.area)}.
      </p>

      {derived.warnings.map((warning) => (
        <p key={warning.code} className="text-muted-foreground">
          {describeWarning(warning)}
        </p>
      ))}
    </div>
  );
}

function Measurement({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = label.replace(/\W+/g, "-").toLowerCase();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
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
      return "Cumplir las dos medidas exactas deformaría la figura: se ha mantenido la proporción y una medida sale menor.";
    case "DETAIL_LIMITED_BY_RESOLUTION":
      return `El detalle está limitado por la resolución de la imagen: tolerancia de ${formatMillimeters(warning.appliedTolerance)}.`;
  }
}

/**
 * El error del dominio, dicho en el idioma del usuario.
 *
 * Aquí el fallo no pasa por HTTP, así que no hay respuesta que traducir: se
 * busca el mismo código en la misma tabla que usa la API.
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
