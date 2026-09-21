"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ImageCrop } from "@/modules/posters/crop";
import type { PosterJoining } from "@/modules/posters/joining";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  useDownloadExport,
  useExportPoster,
} from "@/presentation/client/api/exports";
import { useUnsavedPoster } from "@/presentation/client/api/usage";

/** Lo que el estudio pide al descargar: un lado en mm, recorte y papel. */
export type PosterDownloadRequest = {
  readonly width?: number;
  readonly height?: number;
  readonly crop?: ImageCrop;
  readonly paper: {
    readonly format: PaperFormat;
    readonly orientation: PaperOrientation;
  };
  readonly joining: PosterJoining;
};

/** Cómo se descarga, sin que el estudio sepa si hay proyecto detrás. */
export type PosterDownload = {
  readonly run: (request: PosterDownloadRequest) => Promise<void>;
  readonly busy: boolean;
  /** Qué está haciendo ahora, para el botón. */
  readonly step: string;
};

/**
 * Con proyecto: el PDF se guarda y se descarga con un enlace firmado.
 *
 * El enlace lleva el nombre del archivo y descarga sin abrir otra pestaña:
 * nada que el navegador pueda bloquear después de esperar al PDF.
 */
export function useProjectPosterDownload(
  projectId: string,
  assetId: string | null,
): PosterDownload {
  const generate = useExportPoster(projectId);
  const download = useDownloadExport();

  return useSteps(async (request, setStep) => {
    if (!assetId) {
      return;
    }

    setStep("Generando PDF…");
    const generated = await generate.mutateAsync({ ...request, assetId });

    setStep("Preparando la descarga…");
    const ready = await download.mutateAsync(generated.id);

    window.location.assign(ready.url);
    toast.success(`${generated.fileName}: ${generated.pageCount} hojas.`);
  });
}

/**
 * Sin proyecto: la imagen viaja con la petición y el PDF vuelve en la
 * respuesta. No se guarda nada (docs/usage.md §2).
 */
export function useUnsavedPosterDownload(file: File | null): PosterDownload {
  const generate = useUnsavedPoster();

  return useSteps(async (request, setStep) => {
    if (!file) {
      return;
    }

    setStep("Generando PDF…");
    const { fileName } = await generate.mutateAsync({ ...request, file });

    toast.success(`${fileName} descargado.`);
  });
}

function useSteps(
  work: (
    request: PosterDownloadRequest,
    setStep: (step: string) => void,
  ) => Promise<void>,
): PosterDownload {
  const [step, setStep] = useState<string | null>(null);

  async function run(request: PosterDownloadRequest) {
    try {
      await work(request, setStep);
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
