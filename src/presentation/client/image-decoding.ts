import {
  type SupportedImageFormat,
  validateImageMetadata,
} from "@/modules/image-processing/image-validation";
import type { AlphaMask } from "@/modules/image-processing/mask";
import { alphaMaskFromRgba } from "@/modules/image-processing/rgba-mask";

/**
 * Decodifica una imagen en el navegador y saca su máscara alfa.
 *
 * El navegador ya trae un decodificador, así que una imagen que **ya tiene
 * transparencia** —un PNG recortado— puede convertirse en plantilla hoy, sin
 * esperar a la eliminación de fondo (fase B). Lo que falta es el caso
 * contrario: una foto opaca, donde hay que decidir qué es figura y qué es
 * fondo.
 *
 * Es el único archivo del navegador que toca un canvas. Lo que devuelve es
 * vocabulario del dominio, y a partir de ahí el pipeline es el mismo que
 * correría en el servidor.
 */
export async function readAlphaMask(source: Blob): Promise<AlphaMask> {
  const bitmap = await createImageBitmap(source);

  try {
    // Las dimensiones solo se conocen al decodificar, así que esta es la
    // primera oportunidad de aplicar los límites del dominio.
    validateImageMetadata({
      width: bitmap.width,
      height: bitmap.height,
      mimeType: source.type as SupportedImageFormat,
      byteSize: source.size,
    });

    const context = createContext(bitmap.width, bitmap.height);
    context.drawImage(bitmap, 0, 0);

    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);

    return alphaMaskFromRgba({
      width: bitmap.width,
      height: bitmap.height,
      rgba: data,
    });
  } finally {
    bitmap.close();
  }
}

function createContext(
  width: number,
  height: number,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const canvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });

  // `willReadFrequently` evita que el navegador suba el lienzo a la GPU para
  // tener que bajarlo justo después: aquí solo se lee.
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Este navegador no puede leer los pixels de la imagen.");
  }

  return context as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}
