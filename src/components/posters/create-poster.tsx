"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useUnsavedPosterDownload } from "@/components/posters/poster-downloads";
import { PosterStudio } from "@/components/posters/poster-studio";
import { Button } from "@/components/ui/button";
import { SUPPORTED_IMAGE_FORMATS } from "@/modules/image-processing/image-validation";
import { formatBytes } from "@/presentation/client/format";
import {
  type PreparedImage,
  prepareImageForUpload,
} from "@/presentation/client/prepare-image";

/**
 * El póster sin cuenta y sin proyecto (docs/usage.md §2).
 *
 * La imagen no sale del navegador hasta que se pide el PDF: se enseña desde
 * un enlace local al archivo, y se recorta y se mide aquí. El servidor la
 * recibe con la petición del PDF, la usa y no la guarda.
 */
export function CreatePoster() {
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const file = prepared?.file ?? null;
  const [url, setUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const download = useUnsavedPosterDownload(file);

  // Un enlace local por archivo, y se suelta al cambiarlo: si no, cada
  // imagen elegida se queda en memoria hasta cerrar la pestaña.
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const created = URL.createObjectURL(file);
    setUrl(created);

    return () => URL.revokeObjectURL(created);
  }, [file]);

  async function choose(candidate: File | undefined) {
    if (!candidate) {
      return;
    }

    // Lo mismo que comprobará el servidor, dicho antes de esperar a nada.
    if (
      !SUPPORTED_IMAGE_FORMATS.includes(
        candidate.type as (typeof SUPPORTED_IMAGE_FORMATS)[number],
      )
    ) {
      toast.error("Usa una imagen PNG, JPEG o WEBP.");
      return;
    }

    // Shrunk here, once, before cropping: the crop and the size are then
    // chosen on the image that will actually be sent (docs/image-processing.md §111).
    setPreparing(true);

    try {
      setPrepared(await prepareImageForUpload(candidate));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No pudimos abrir la imagen.",
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept={SUPPORTED_IMAGE_FORMATS.join(",")}
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            choose(event.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-card" : "border-border"
          }`}
        >
          <p className="font-medium">
            {file ? file.name : "Arrastra aquí tu imagen"}
          </p>
          <p className="text-muted-foreground text-sm">
            {preparing
              ? "Preparando la imagen…"
              : prepared
                ? describe(prepared)
                : "PNG, JPEG o WEBP de al menos 200 × 200 px. Cuanta más resolución, más nítida sale en grande."}
          </p>
          <Button
            variant={file ? "outline" : "default"}
            disabled={preparing}
            onClick={() => input.current?.click()}
          >
            {file ? "Cambiar imagen" : "Elegir imagen"}
          </Button>
        </div>
      </section>

      <p className="text-muted-foreground text-xs">
        Al generar el PDF aceptas los{" "}
        <Link href="/terminos" className="underline underline-offset-4">
          términos de uso
        </Link>{" "}
        y el tratamiento mínimo de datos que describe la{" "}
        <Link href="/privacidad" className="underline underline-offset-4">
          política de tratamiento de datos
        </Link>
        .
      </p>

      <PosterStudio
        // Otra imagen, otro recorte y otro tamaño: se empieza de cero.
        key={file ? `${file.name}-${file.lastModified}-${file.size}` : "none"}
        image={
          file && url ? { key: `${file.name}-${file.lastModified}`, url } : null
        }
        download={download}
      />
    </div>
  );
}

/** What the person needs to know about the file that will be sent. */
function describe(prepared: PreparedImage): string {
  const kept =
    "se queda en tu navegador hasta que descargues el PDF, y no la guardamos.";

  if (!prepared.shrunk) {
    return `${formatBytes(prepared.sent.byteSize)} · ${kept}`;
  }

  return `La reducimos de ${formatBytes(prepared.original.byteSize)} (${prepared.original.width} × ${prepared.original.height} px) a ${formatBytes(prepared.sent.byteSize)} (${prepared.sent.width} × ${prepared.sent.height} px) para poder enviarla, sin que se note al imprimir. ${kept[0].toUpperCase()}${kept.slice(1)}`;
}
