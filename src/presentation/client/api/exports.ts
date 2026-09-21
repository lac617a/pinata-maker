import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ImageCrop } from "@/modules/posters/crop";
import type { PosterJoining } from "@/modules/posters/joining";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import { usageKeys } from "@/presentation/client/api/usage";
import { apiRequest } from "@/presentation/client/api-client";

/** Un PDF ya generado. Ver docs/storage.md §160-§164. */
export type ProjectExport = {
  readonly id: string;
  readonly projectId: string;
  readonly templateVersionId: string | null;
  readonly sourceAssetId: string | null;
  /** Tamaño impreso en mm; nulo en documentos antiguos. */
  readonly width: number | null;
  readonly height: number | null;
  readonly fileName: string;
  readonly contentType: string;
  readonly pageCount: number;
  readonly byteSize: number;
  readonly paperFormat: PaperFormat;
  readonly paperOrientation: PaperOrientation;
  readonly generatorVersion: string;
  readonly createdAt: string;
};

export const exportKeys = {
  ofProject: (projectId: string) => ["projects", projectId, "exports"] as const,
};

export function useProjectExports(projectId: string) {
  return useQuery({
    queryKey: exportKeys.ofProject(projectId),
    queryFn: async () =>
      (
        await apiRequest<{ exports: ProjectExport[] }>(
          `/api/projects/${projectId}/exports`,
        )
      ).exports,
  });
}

export type CreateExportInput = {
  readonly templateVersionId: string;
  readonly paper?: {
    readonly format: PaperFormat;
    readonly orientation: PaperOrientation;
  };
};

export function useCreateExport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateExportInput) =>
      (
        await apiRequest<{ export: ProjectExport }>(
          `/api/projects/${projectId}/exports`,
          { method: "POST", body: JSON.stringify(input) },
        )
      ).export,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: exportKeys.ofProject(projectId),
      }),
  });
}

/**
 * Pide el enlace de descarga de un documento.
 *
 * El enlace es temporal y se pide en el momento de descargar, no al listar:
 * firmar cincuenta enlaces para enseñar una lista es trabajo tirado, y uno
 * firmado hace media hora ya no serviría.
 */
export function useDownloadExport() {
  return useMutation({
    mutationFn: async (exportId: string) =>
      (
        await apiRequest<{ export: ProjectExport & { url: string } }>(
          `/api/exports/${exportId}`,
        )
      ).export,
  });
}

export function useDeleteExport(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exportId: string) =>
      apiRequest<void>(`/api/exports/${exportId}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: exportKeys.ofProject(projectId),
      }),
  });
}

export type ExportPosterInput = {
  readonly assetId: string;
  /** Un lado en milímetros; el otro lo calcula el servidor con la imagen. */
  readonly width?: number;
  readonly height?: number;
  /** La parte de la imagen que se imprime, en pixels. Sin él, entera. */
  readonly crop?: ImageCrop;
  readonly paper: {
    readonly format: PaperFormat;
    readonly orientation: PaperOrientation;
  };
  /** Overlap or trim; without it the server overlaps (docs/pdf.md §99). */
  readonly joining?: PosterJoining;
};

/** Genera el póster de una imagen. Ver docs/PRD.md §44. */
export function useExportPoster(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExportPosterInput) =>
      (
        await apiRequest<{ export: ProjectExport }>(
          `/api/projects/${projectId}/posters`,
          { method: "POST", body: JSON.stringify(input) },
        )
      ).export,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: exportKeys.ofProject(projectId),
      });
      // Cada PDF cuenta en el límite diario (docs/usage.md §8).
      void queryClient.invalidateQueries({ queryKey: usageKeys.today });
    },
  });
}
