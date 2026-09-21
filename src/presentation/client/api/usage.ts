import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ImageCrop } from "@/modules/posters/crop";
import type { PosterJoining } from "@/modules/posters/joining";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import { apiRequest, errorFrom } from "@/presentation/client/api-client";

/** Cuánto le queda hoy. Ver docs/usage.md §9. */
export type Usage = {
  readonly level: "ANONYMOUS" | "REGISTERED" | "PAID";
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  /** ISO, en UTC. La interfaz lo enseña en hora local. */
  readonly resetsAt: string;
};

export const usageKeys = { today: ["usage"] as const };

export function useUsage() {
  return useQuery({
    queryKey: usageKeys.today,
    queryFn: async () =>
      (await apiRequest<{ usage: Usage }>("/api/usage")).usage,
    // Cambia con cada PDF, que ya invalida la consulta; y a medianoche,
    // que no merece sondear.
    staleTime: 60_000,
  });
}

/** Lo mismo que pide el póster de un proyecto, sin proyecto. */
export type UnsavedPosterInput = {
  readonly file: File;
  readonly width?: number;
  readonly height?: number;
  readonly crop?: ImageCrop;
  readonly paper: {
    readonly format: PaperFormat;
    readonly orientation: PaperOrientation;
  };
  /** Overlap or trim; without it the server overlaps (docs/pdf.md §99). */
  readonly joining?: PosterJoining;
  /** Required by the server without an account (docs/legal.md §8). */
  readonly acceptedTerms: boolean;
};

/**
 * Genera el póster sin guardar nada y lo descarga (docs/usage.md §2).
 *
 * La respuesta es el PDF, no JSON: se descarga desde un enlace local al
 * `Blob`, sin abrir otra pestaña. Si falla, el cuerpo sí es el JSON de
 * error de siempre.
 */
export function useUnsavedPoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, ...options }: UnsavedPosterInput) => {
      const form = new FormData();

      form.set("image", file);
      form.set("options", JSON.stringify(options));

      const response = await fetch("/api/posters", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw await errorFrom(response);
      }

      const fileName = downloadName(response) ?? "poster.pdf";

      saveBlob(await response.blob(), fileName);

      return { fileName };
    },
    // También si falla: un 429 significa que el contador ya no es el que
    // se estaba enseñando.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: usageKeys.today }),
  });
}

function downloadName(response: Response): string | null {
  const header = response.headers.get("content-disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];

  if (encoded) {
    return decodeURIComponent(encoded);
  }

  return /filename="([^"]+)"/i.exec(header)?.[1] ?? null;
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  // Después de que el navegador haya empezado la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
