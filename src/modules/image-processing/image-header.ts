import {
  InvalidImageDimensionsError,
  UnsupportedImageFormatError,
} from "./errors";
import type { SupportedImageFormat } from "./image-validation";
import type { Pixels } from "./pixel-contour";

/**
 * Lo que dice el propio archivo, no lo que dice quien lo sube.
 *
 * El tipo MIME y la extensión los declara el cliente (docs/storage.md §44):
 * un archivo puede llamarse `.png` y ser otra cosa. La cabecera no miente, y
 * trae además el tamaño en pixels, que el servidor necesita para calcular el
 * póster sin decodificar la imagen entera. Ver docs/image-processing.md §110.
 */
export type ImageHeader = {
  readonly format: SupportedImageFormat;
  readonly width: Pixels;
  readonly height: Pixels;
  /**
   * Orientación EXIF, del 1 al 8. 1 es «tal cual».
   *
   * Solo las fotos JPEG la traen. Un navegador la aplica al enseñar la
   * imagen; un PDF que incrusta los bytes, no. Ver docs/image-processing.md §9.
   */
  readonly orientation: number;
};

export function readImageHeader(bytes: Uint8Array): ImageHeader {
  if (isPng(bytes)) {
    return readPng(bytes);
  }

  if (isJpeg(bytes)) {
    return readJpeg(bytes);
  }

  if (isWebp(bytes)) {
    return readWebp(bytes);
  }

  throw new UnsupportedImageFormatError(
    "The file is not a PNG, JPEG or WEBP image, whatever its name says.",
  );
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array): boolean {
  return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
}

/** El primer bloque de un PNG es siempre IHDR, con ancho y alto. */
function readPng(bytes: Uint8Array): ImageHeader {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") {
    throw corrupt("PNG");
  }

  return {
    format: "image/png",
    width: uint32BE(bytes, 16),
    height: uint32BE(bytes, 20),
    orientation: 1,
  };
}

/**
 * Un JPEG es una sucesión de marcadores. El tamaño está en el primer SOF, y
 * la orientación, si la hay, en el bloque EXIF (APP1) que va antes.
 */
function readJpeg(bytes: Uint8Array): ImageHeader {
  let offset = 2;
  let orientation = 1;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw corrupt("JPEG");
    }

    const marker = bytes[offset + 1];

    // Relleno: varios 0xFF seguidos son válidos entre marcadores.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }

    const length = uint16BE(bytes, offset + 2);

    if (marker === 0xe1 && ascii(bytes, offset + 4, 4) === "Exif") {
      orientation = exifOrientation(bytes, offset + 10) ?? orientation;
    }

    if (isStartOfFrame(marker)) {
      return {
        format: "image/jpeg",
        height: uint16BE(bytes, offset + 5),
        width: uint16BE(bytes, offset + 7),
        orientation,
      };
    }

    offset += 2 + length;
  }

  throw corrupt("JPEG");
}

/** SOF0–SOF15 salvo DHT (C4), JPG (C8) y DAC (CC), que comparten rango. */
function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

/** Etiqueta 0x0112 del primer directorio TIFF dentro del bloque EXIF. */
function exifOrientation(bytes: Uint8Array, tiff: number): number | null {
  const littleEndian = ascii(bytes, tiff, 2) === "II";
  const read16 = (at: number) =>
    littleEndian ? uint16LE(bytes, at) : uint16BE(bytes, at);
  const read32 = (at: number) =>
    littleEndian ? uint32LE(bytes, at) : uint32BE(bytes, at);

  if (tiff + 8 > bytes.length) {
    return null;
  }

  const directory = tiff + read32(tiff + 4);

  if (directory + 2 > bytes.length) {
    return null;
  }

  const entries = read16(directory);

  for (let index = 0; index < entries; index++) {
    const entry = directory + 2 + index * 12;

    if (entry + 12 > bytes.length) {
      return null;
    }

    if (read16(entry) === 0x0112) {
      const value = read16(entry + 8);

      return value >= 1 && value <= 8 ? value : null;
    }
  }

  return null;
}

/** WEBP tiene tres variantes, cada una con el tamaño en un sitio distinto. */
function readWebp(bytes: Uint8Array): ImageHeader {
  const chunk = ascii(bytes, 12, 4);

  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      format: "image/webp",
      width: 1 + uint24LE(bytes, 24),
      height: 1 + uint24LE(bytes, 27),
      orientation: 1,
    };
  }

  if (chunk === "VP8 " && bytes.length >= 30) {
    return {
      format: "image/webp",
      width: uint16LE(bytes, 26) & 0x3fff,
      height: uint16LE(bytes, 28) & 0x3fff,
      orientation: 1,
    };
  }

  if (chunk === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];

    return {
      format: "image/webp",
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      orientation: 1,
    };
  }

  throw corrupt("WEBP");
}

function corrupt(format: string): InvalidImageDimensionsError {
  return new InvalidImageDimensionsError(
    `The ${format} file is damaged: its size could not be read.`,
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint16BE(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

function uint16LE(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

function uint24LE(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
}

function uint32BE(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] << 24) >>> 0) +
    ((bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3])
  );
}

function uint32LE(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at + 3] << 24) >>> 0) +
    ((bytes[at + 2] << 16) | (bytes[at + 1] << 8) | bytes[at])
  );
}
