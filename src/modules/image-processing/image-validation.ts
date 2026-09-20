import {
  ImageFileTooLargeError,
  InvalidImageDimensionsError,
  UnsupportedImageFormatError,
} from "./errors";
import type { Pixels } from "./pixel-contour";

/**
 * Formatos admitidos por el MVP.
 *
 * No se añaden formatos por previsión: cada uno arrastra su propio
 * comportamiento al decodificar. Ver docs/image-processing.md §5 y
 * docs/PRD.md §8.
 */
export const SUPPORTED_IMAGE_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type SupportedImageFormat = (typeof SUPPORTED_IMAGE_FORMATS)[number];

/**
 * Extensiones que puede llevar cada formato.
 *
 * Se comprueban junto al MIME type porque el nombre lo elige el usuario y el
 * MIME lo declara el cliente: ninguno de los dos es de fiar por separado.
 * Ver docs/AGENTS.md §46.
 */
const FORMAT_EXTENSIONS: Record<SupportedImageFormat, readonly string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

/**
 * Límites del sistema, en un único sitio.
 *
 * Ver docs/image-processing.md §7: los límites son configuración, no valores
 * repartidos por el código.
 */
export const IMAGE_LIMITS = {
  /** Una foto de móvil razonable cabe de sobra; un escaneo enorme no. */
  maxFileBytes: 10 * 1024 * 1024,
  /**
   * Por debajo de este tamaño el contorno no tiene detalle suficiente para
   * una figura de casi un metro: cada pixel valdría varios milímetros.
   */
  minWidth: 200,
  minHeight: 200,
  maxWidth: 8000,
  maxHeight: 8000,
  /**
   * Techo independiente del lado más largo: una imagen de 8000 × 8000 son 64
   * millones de pixels que hay que recorrer varias veces.
   */
  maxPixels: 40_000_000,
} as const;

/**
 * Lo que se conoce del archivo antes de decodificarlo.
 *
 * Ver docs/image-processing.md §8.
 */
export type ImageUpload = {
  readonly fileName: string;
  readonly mimeType: string;
  readonly byteSize: number;
};

export type ImageMetadata = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly mimeType: SupportedImageFormat;
  readonly byteSize: number;
};

/**
 * Valida el archivo subido antes de intentar decodificarlo.
 *
 * Es validación de entrada, no de dominio: comprueba que el archivo merece
 * que se gaste trabajo en él. Ver docs/AGENTS.md §25.
 *
 * Debe ejecutarse también en el servidor aunque el cliente ya la haya hecho:
 * un cliente puede saltársela. Ver docs/PRD.md §8.
 */
export function validateImageUpload(upload: ImageUpload): SupportedImageFormat {
  const format = supportedFormat(upload.mimeType);

  if (!format) {
    throw new UnsupportedImageFormatError(
      `Unsupported image type "${upload.mimeType}", expected one of ${SUPPORTED_IMAGE_FORMATS.join(", ")}.`,
    );
  }

  const extension = fileExtension(upload.fileName);

  if (!FORMAT_EXTENSIONS[format].includes(extension)) {
    throw new UnsupportedImageFormatError(
      `File "${upload.fileName}" does not match its declared type ${format}.`,
    );
  }

  if (!Number.isFinite(upload.byteSize) || upload.byteSize <= 0) {
    throw new ImageFileTooLargeError(
      `The uploaded file has no readable size, received ${upload.byteSize} bytes.`,
    );
  }

  if (upload.byteSize > IMAGE_LIMITS.maxFileBytes) {
    throw new ImageFileTooLargeError(
      `The image weighs ${upload.byteSize} bytes, above the limit of ${IMAGE_LIMITS.maxFileBytes}.`,
    );
  }

  return format;
}

/**
 * Valida lo que se sabe de la imagen una vez decodificada.
 *
 * Va aparte de `validateImageUpload` porque las dimensiones solo se conocen
 * después de leer el archivo, y para entonces ya se sabe que el formato es
 * admitido. Ver docs/image-processing.md §6.
 */
export function validateImageMetadata(metadata: ImageMetadata): ImageMetadata {
  const { width, height } = metadata;

  if (!isWholePixelCount(width) || !isWholePixelCount(height)) {
    throw new InvalidImageDimensionsError(
      `Image dimensions must be whole positive pixel counts, received ${width} × ${height}.`,
    );
  }

  if (width < IMAGE_LIMITS.minWidth || height < IMAGE_LIMITS.minHeight) {
    throw new InvalidImageDimensionsError(
      `The image measures ${width} × ${height} px, below the minimum of ${IMAGE_LIMITS.minWidth} × ${IMAGE_LIMITS.minHeight}.`,
    );
  }

  if (width > IMAGE_LIMITS.maxWidth || height > IMAGE_LIMITS.maxHeight) {
    throw new InvalidImageDimensionsError(
      `The image measures ${width} × ${height} px, above the maximum of ${IMAGE_LIMITS.maxWidth} × ${IMAGE_LIMITS.maxHeight}.`,
    );
  }

  if (width * height > IMAGE_LIMITS.maxPixels) {
    throw new InvalidImageDimensionsError(
      `The image contains ${width * height} pixels, above the limit of ${IMAGE_LIMITS.maxPixels}.`,
    );
  }

  return metadata;
}

/** Ver docs/image-processing.md §8. */
export function imageAspectRatio(metadata: ImageMetadata): number {
  return metadata.width / metadata.height;
}

function supportedFormat(mimeType: string): SupportedImageFormat | undefined {
  return SUPPORTED_IMAGE_FORMATS.find(
    (format) => format === mimeType.trim().toLowerCase(),
  );
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");

  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

function isWholePixelCount(value: Pixels): boolean {
  return Number.isInteger(value) && value > 0;
}
