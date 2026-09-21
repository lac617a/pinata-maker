"use client";

import Link from "next/link";
import { useState } from "react";

import { ProjectExports } from "@/components/exports/project-exports";
import { ProjectImages } from "@/components/projects/project-images";
import { TemplateStudio } from "@/components/templates/template-studio";
import { TemplateVersions } from "@/components/templates/template-versions";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectImages } from "@/presentation/client/api/images";
import { useProject } from "@/presentation/client/api/projects";
import { useTemplateVersions } from "@/presentation/client/api/templates";

/**
 * El proyecto de punta a punta: imagen, molde y descarga.
 *
 * El camino principal es corto a propósito: subir una imagen, ajustar las
 * medidas mirando el molde y descargar. Las versiones y los documentos
 * generados quedan como historial, plegados, porque son registro y no pasos.
 */
export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const images = useProjectImages(projectId);
  const versions = useTemplateVersions(projectId);

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

      <TemplateStudio
        projectId={projectId}
        projectName={project.data?.name ?? "Plantilla"}
        image={selectedImage}
      />

      <details className="border-border space-y-4 rounded-lg border p-4">
        <summary className="cursor-pointer font-serif text-lg">
          Historial
          <span className="text-muted-foreground font-sans text-sm">
            {" "}
            · {versions.data?.length ?? 0} versiones
          </span>
        </summary>

        <div className="mt-4 space-y-6">
          <ProjectExports projectId={projectId} />
          <TemplateVersions
            versions={versions.data}
            isPending={versions.isPending}
          />
        </div>
      </details>
    </main>
  );
}
