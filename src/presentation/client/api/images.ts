import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/presentation/client/api-client";

/**
 * Imagen de un proyecto, lista para enseñarse.
 *
 * `url` es temporal y caduca: el bucket es privado y el navegador recibe un
 * permiso con fecha, no una ruta pública. Ver docs/storage.md §151.
 */
export type ProjectImage = {
  readonly id: string;
  readonly kind: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly originalName: string;
  readonly createdAt: string;
  readonly url: string;
};

/** El mismo nombre de campo que espera el endpoint. */
export const IMAGE_FIELD = "image";

export const imageKeys = {
  ofProject: (projectId: string) => ["projects", projectId, "images"] as const,
};

export function useProjectImages(projectId: string) {
  return useQuery({
    queryKey: imageKeys.ofProject(projectId),
    queryFn: async () =>
      (
        await apiRequest<{ images: ProjectImage[] }>(
          `/api/projects/${projectId}/images`,
        )
      ).images,
    /**
     * Las URL firmadas caducan a los diez minutos.
     *
     * Volver a pedirlas antes de que caduquen evita que el usuario se
     * encuentre una imagen rota por haber dejado la pestaña abierta.
     */
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadImage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set(IMAGE_FIELD, file);

      // La respuesta de la subida no trae URL: el archivo acaba de subirse y
      // el listado es quien firma los enlaces.
      return apiRequest<{ asset: Omit<ProjectImage, "url"> }>(
        `/api/projects/${projectId}/images`,
        { method: "POST", body: form },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: imageKeys.ofProject(projectId),
      }),
  });
}

export function useDeleteImage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) =>
      apiRequest<void>(`/api/images/${imageId}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: imageKeys.ofProject(projectId),
      }),
  });
}
