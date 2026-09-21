"use client";

import Image from "next/image";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteImage,
  useProjectImages,
  useUploadImage,
} from "@/presentation/client/api/images";
import { formatBytes } from "@/presentation/client/format";

/**
 * Las imágenes del proyecto.
 *
 * El original es inmutable: subir otra no sustituye a la anterior, crea una
 * más (docs/storage.md §149). Por eso esto es una lista y no un hueco.
 */
export function ProjectImages({
  projectId,
  selectedImageId,
  onSelect,
}: {
  projectId: string;
  selectedImageId: string | null;
  onSelect: (imageId: string) => void;
}) {
  const images = useProjectImages(projectId);
  const upload = useUploadImage(projectId);
  const remove = useDeleteImage(projectId);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl">Imagen</h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {upload.isPending ? "Subiendo…" : "Subir imagen"}
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (!file) {
            return;
          }

          upload.mutate(file, {
            onSuccess: (result) => onSelect(result.asset.id),
            onError: (error) => toast.error(error.message),
          });
        }}
      />

      <p className="text-muted-foreground text-sm">
        PNG con el fondo ya recortado. Una imagen sin transparencia produce un
        molde con la forma del rectángulo entero: quitar el fondo todavía no lo
        hace la aplicación.
      </p>

      {images.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : null}

      {images.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Este proyecto no tiene ninguna imagen todavía.
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {images.data?.map((image) => (
          <li
            key={image.id}
            className={`border-border bg-card space-y-3 rounded-lg border p-3 ${
              image.id === selectedImageId ? "ring-ring ring-2" : ""
            }`}
          >
            <button
              type="button"
              className="block w-full cursor-pointer"
              onClick={() => onSelect(image.id)}
            >
              {/*
                Las URL son firmadas y de un dominio que no se conoce al
                compilar, así que el optimizador de Next no puede tocarlas.
              */}
              <Image
                src={image.url}
                alt={image.originalName}
                width={320}
                height={240}
                unoptimized
                className="h-40 w-full rounded-md object-contain"
              />
            </button>

            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm">
                {image.originalName}
                <span className="text-muted-foreground">
                  {" "}
                  · {formatBytes(image.byteSize)}
                </span>
              </p>
              <Button
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(image.id, {
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                Borrar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
