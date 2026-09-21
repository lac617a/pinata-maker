import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectStatus } from "@/modules/projects/project";
import { apiRequest } from "@/presentation/client/api-client";

/**
 * El proyecto tal y como sale de la API.
 *
 * No es la entidad del dominio: no lleva `ownerId` —quien pregunta ya sabe
 * que es suyo— y las fechas viajan como texto. Ver docs/storage.md §29.
 */
export type Project = {
  readonly id: string;
  readonly name: string;
  readonly status: ProjectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async () =>
      (await apiRequest<{ projects: Project[] }>("/api/projects")).projects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () =>
      (await apiRequest<{ project: Project }>(`/api/projects/${id}`)).project,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) =>
      (
        await apiRequest<{ project: Project }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ name }),
        })
      ).project,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      (
        await apiRequest<{ project: Project }>(`/api/projects/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        })
      ).project,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(project.id),
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
