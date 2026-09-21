import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TemplateDefinition } from "@/modules/templates/template-definition";
import { apiRequest } from "@/presentation/client/api-client";

/**
 * Una versión publicada, sin su geometría.
 *
 * El listado no arrastra la definición: pesa cientos de kilobytes por fila.
 * Ver docs/storage.md §157.
 */
export type TemplateVersionSummary = {
  readonly id: string;
  readonly projectId: string;
  readonly versionNumber: number;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly pieceCount: number;
  readonly derivationVersion: string;
  readonly schemaVersion: number;
  readonly sourceAssetId: string | null;
  readonly createdAt: string;
};

export const templateKeys = {
  ofProject: (projectId: string) =>
    ["projects", projectId, "templates"] as const,
};

export function useTemplateVersions(projectId: string) {
  return useQuery({
    queryKey: templateKeys.ofProject(projectId),
    queryFn: async () =>
      (
        await apiRequest<{ versions: TemplateVersionSummary[] }>(
          `/api/projects/${projectId}/templates`,
        )
      ).versions,
  });
}

export type PublishTemplateInput = {
  readonly template: TemplateDefinition;
  readonly sourceAssetId?: string | null;
  /**
   * Última versión que conocía quien publica.
   *
   * Si el proyecto ya va por otra, la petición se rechaza con 409 en lugar de
   * encadenarse a un estado que este navegador no llegó a ver.
   * Ver docs/storage.md §156.
   */
  readonly expectedVersionNumber?: number;
};

export function usePublishTemplateVersion(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PublishTemplateInput) =>
      (
        await apiRequest<{ version: TemplateVersionSummary }>(
          `/api/projects/${projectId}/templates`,
          { method: "POST", body: JSON.stringify(input) },
        )
      ).version,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: templateKeys.ofProject(projectId),
      }),
  });
}
