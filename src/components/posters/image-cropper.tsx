"use client";

import "react-image-crop/dist/ReactCrop.css";

import ReactCrop, { type PercentCrop } from "react-image-crop";

import { Button } from "@/components/ui/button";
import type { ImageCrop } from "@/modules/posters/crop";

/** Toda la imagen, en el formato de la librería. */
export const WHOLE_IMAGE: PercentCrop = {
  unit: "%",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};

/**
 * Recuadro para elegir qué parte de la imagen se imprime.
 *
 * El recuadro lo pinta `react-image-crop`: arrastre, asas, teclado y
 * pantallas táctiles son lo difícil de hacer bien y no tienen nada propio de
 * este producto. Trabaja en porcentajes para no depender del tamaño con que
 * se vea la imagen; `toImageCrop` lo pasa a pixels de la imagen original, que
 * es lo que el servidor comprueba (docs/pdf.md §95).
 */
export function ImageCropper({
  imageUrl,
  crop,
  onChange,
}: {
  imageUrl: string;
  crop: PercentCrop;
  onChange: (crop: PercentCrop) => void;
}) {
  const whole = isWholeImage(crop);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Arrastra las esquinas para quedarte con una parte.
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={whole}
          onClick={() => onChange(WHOLE_IMAGE)}
        >
          Imagen entera
        </Button>
      </div>

      <div className="border-border bg-card flex h-[32rem] items-center justify-center rounded-lg border p-4">
        <ReactCrop
          crop={crop}
          // Un recorte vacío dejaría el póster sin proporción: al hacer
          // clic fuera se conserva el que había.
          keepSelection
          ruleOfThirds
          onChange={(_pixels, percent) => onChange(percent)}
          className="max-h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada que caduca: el optimizador de Next la cachearía. */}
          <img
            src={imageUrl}
            alt="Imagen del proyecto"
            className="max-h-[30rem] w-auto"
          />
        </ReactCrop>
      </div>
    </div>
  );
}

export function isWholeImage(crop: PercentCrop): boolean {
  return crop.width >= 99.95 && crop.height >= 99.95;
}

/**
 * Del porcentaje de la librería a pixels enteros de la imagen original,
 * sin salirse de ella por un redondeo.
 */
export function toImageCrop(
  crop: PercentCrop,
  image: { readonly width: number; readonly height: number },
): ImageCrop {
  const x = Math.max(0, Math.round((crop.x / 100) * image.width));
  const y = Math.max(0, Math.round((crop.y / 100) * image.height));

  return {
    x,
    y,
    width: Math.min(
      image.width - x,
      Math.round((crop.width / 100) * image.width),
    ),
    height: Math.min(
      image.height - y,
      Math.round((crop.height / 100) * image.height),
    ),
  };
}
