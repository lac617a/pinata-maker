"use client";

import Link from "next/link";
import { useState } from "react";

import { ProjectExports } from "@/components/exports/project-exports";
import { PosterStudio } from "@/components/posters/poster-studio";
import { ProjectImages } from "@/components/projects/project-images";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectImages } from "@/presentation/client/api/images";
import { useProject } from "@/presentation/client/api/projects";

/**
 * El proyecto de punta a punta: imagen, tamaño y descarga.
 *
 * El camino principal es corto a propósito: subir una imagen, elegir cuánto
 * mide mirando cómo se reparte en hojas y descargar (docs/PRD.md §44). Los
 * PDF ya generados quedan plegados debajo: son registro, no pasos.
 */
export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const images = useProjectImages(projectId);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Sin selección explícita, la más reciente: es la que se acaba de subir.
  const selectedImage =
    images.data?.find((image) => image.id === selectedImageId) ??
    images.data?.[0] ??
    null;

  if (project.error) {
    return (
      <main className="space-y-4">
        <p role="alert" className="text-destructive">
          {project.error.message}
        </p>
        <Link href="/proyectos" className="underline">
          Volver a mis proyectos
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-10">
      <div className="space-y-2">
        <Link
          href="/proyectos"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Mis proyectos
        </Link>

        {project.isPending ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="font-serif text-3xl">{project.data?.name}</h1>
        )}
      </div>

      <ProjectImages
        projectId={projectId}
        selectedImageId={selectedImage?.id ?? null}
        onSelect={setSelectedImageId}
      />

      {/* Otra imagen, otro recorte y otro tamaño: se empieza de cero. */}
      <PosterStudio
        key={selectedImage?.id ?? "none"}
        projectId={projectId}
        image={selectedImage}
      />

      <details className="border-border space-y-4 rounded-lg border p-4">
        <summary className="cursor-pointer font-serif text-lg">
          PDF generados
        </summary>

        <div className="mt-4">
          <ProjectExports projectId={projectId} />
        </div>
      </details>
    </main>
  );
}
