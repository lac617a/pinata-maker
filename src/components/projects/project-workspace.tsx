"use client";

import Link from "next/link";
import { useState } from "react";

import { ProjectExports } from "@/components/exports/project-exports";
import { ProjectImages } from "@/components/projects/project-images";
import { PublishTemplateForm } from "@/components/templates/publish-template-form";
import { TemplateVersions } from "@/components/templates/template-versions";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectImages } from "@/presentation/client/api/images";
import { useProject } from "@/presentation/client/api/projects";
import { useTemplateVersions } from "@/presentation/client/api/templates";

/**
 * El proyecto de punta a punta: imagen, molde, versiones y documentos.
 *
 * Es una sola pantalla a propósito. El trabajo del usuario es una cadena
 * —subir, medir, publicar, imprimir— y repartirla en pasos separados
 * obligaría a ir y volver para comparar lo que acaba de salir.
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

      <PublishTemplateForm
        projectId={projectId}
        projectName={project.data?.name ?? "Plantilla"}
        image={selectedImage}
        latestVersionNumber={versions.data?.[0]?.versionNumber ?? 0}
      />

      <TemplateVersions
        projectId={projectId}
        versions={versions.data}
        isPending={versions.isPending}
      />

      <ProjectExports projectId={projectId} />
    </main>
  );
}
