"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Project,
  useCreateProject,
  useDeleteProject,
  useProjects,
  useRenameProject,
} from "@/presentation/client/api/projects";

/** Lo que el usuario lee de cada estado. Ver docs/PRD.md §22. */
const STATUS_LABEL: Record<Project["status"], string> = {
  DRAFT: "Borrador",
  PROCESSING: "Procesando",
  READY: "Listo",
  ERROR: "Con error",
};

export function ProjectsPanel() {
  const projects = useProjects();

  return (
    <div className="space-y-8">
      <NewProjectForm />

      {projects.isPending ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((row) => (
            <li key={row}>
              <Skeleton className="h-20 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      ) : null}

      {projects.error ? (
        <p role="alert" className="text-destructive text-sm">
          {projects.error.message}
        </p>
      ) : null}

      {projects.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no hay proyectos. Crea el primero con el nombre de la figura
          que quieres convertir en piñata.
        </p>
      ) : null}

      <ul className="space-y-3">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <ProjectRow project={project} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewProjectForm() {
  const [name, setName] = useState("");
  const createProject = useCreateProject();

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();

        createProject.mutate(name, {
          onSuccess: () => setName(""),
          onError: (error) => toast.error(error.message),
        });
      }}
    >
      <Input
        aria-label="Nombre del proyecto"
        placeholder="Elefante de cumpleaños"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" disabled={createProject.isPending}>
        Crear
      </Button>
    </form>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const renameProject = useRenameProject();
  const deleteProject = useDeleteProject();

  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-4">
      <div className="min-w-48 flex-1">
        {renaming ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = new FormData(event.currentTarget).get("name");

              renameProject.mutate(
                { id: project.id, name: String(name ?? "") },
                {
                  onSuccess: () => setRenaming(false),
                  onError: (error) => toast.error(error.message),
                },
              );
            }}
          >
            <Input
              name="name"
              aria-label="Nuevo nombre"
              defaultValue={project.name}
              autoFocus
            />
            <Button type="submit" size="sm" disabled={renameProject.isPending}>
              Guardar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRenaming(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <>
            <Link
              href={`/proyectos/${project.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {project.name}
            </Link>
            <p className="text-muted-foreground text-sm">
              {STATUS_LABEL[project.status]} · creado el{" "}
              {new Date(project.createdAt).toLocaleDateString("es")}
            </p>
          </>
        )}
      </div>

      {renaming ? null : (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setRenaming(true)}>
            Renombrar
          </Button>

          {/*
            Dos pasos en lugar de un diálogo: borrar un proyecto se lleva sus
            imágenes, sus versiones y sus documentos por delante.
          */}
          {confirmingDelete ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteProject.isPending}
                onClick={() =>
                  deleteProject.mutate(project.id, {
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                Sí, borrar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                No
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
            >
              Borrar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
