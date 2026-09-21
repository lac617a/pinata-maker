import { describe, expect, it } from "vitest";

import {
  InvalidImageDimensionsError,
  UnsupportedImageFormatError,
} from "./errors";
import { readImageHeader } from "./image-header";

function bytes(...parts: (number[] | string)[]): Uint8Array {
  return new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? [...part].map((c) => c.charCodeAt(0)) : part,
    ),
  );
}

const be32 = (n: number) => [
  n >>> 24,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

function png(width: number, height: number): Uint8Array {
  return bytes(
    [137, 80, 78, 71, 13, 10, 26, 10],
    be32(13),
    "IHDR",
    be32(width),
    be32(height),
    [8, 6, 0, 0, 0],
  );
}

/** JPEG mínimo: SOI, un EXIF opcional y el SOF0 con el tamaño. */
function jpeg(width: number, height: number, orientation?: number): Uint8Array {
  const exif =
    orientation === undefined
      ? []
      : [
          0xff,
          0xe1,
          ...be16(2 + 6 + 8 + 2 + 12),
          ...[..."Exif"].map((c) => c.charCodeAt(0)),
          0,
          0,
          // Cabecera TIFF big-endian: MM, 42, directorio en el byte 8.
          ...[..."MM"].map((c) => c.charCodeAt(0)),
          ...be16(42),
          ...be32(8),
          ...be16(1),
          // Etiqueta 0x0112 (orientación), SHORT, un valor.
          ...be16(0x0112),
          ...be16(3),
          ...be32(1),
          ...be16(orientation),
          0,
          0,
        ];

  return bytes([0xff, 0xd8], exif, [
    0xff,
    0xc0,
    ...be16(11),
    8,
    ...be16(height),
    ...be16(width),
    1,
    1,
    0x11,
    0,
  ]);
}

function webp(chunk: "VP8X" | "VP8L" | "VP8 ", width: number, height: number) {
  const header = bytes("RIFF", [0, 0, 0, 0], "WEBP", chunk, [0, 0, 0, 0]);

  if (chunk === "VP8X") {
    return bytes([...header], [0, 0, 0, 0], le24(width - 1), le24(height - 1));
  }

  if (chunk === "VP8 ") {
    return bytes(
      [...header],
      [0, 0, 0, 0x9d, 0x01, 0x2a],
      le16(width),
      le16(height),
    );
  }

  // VP8L: firma 0x2f y 14 bits por dimensión, empaquetados.
  const w = width - 1;
  const h = height - 1;

  return bytes(
    [...header],
    [0x2f],
    [
      w & 0xff,
      ((w >> 8) & 0x3f) | ((h & 0x3) << 6),
      (h >> 2) & 0xff,
      (h >> 10) & 0xf,
    ],
  );
}

describe("Image header", () => {
  it("should read the size of a PNG", () => {
    expect(readImageHeader(png(720, 894))).toEqual({
      format: "image/png",
      width: 720,
      height: 894,
      orientation: 1,
    });
  });

  it("should read the size of a JPEG", () => {
    expect(readImageHeader(jpeg(720, 894))).toMatchObject({
      format: "image/jpeg",
      width: 720,
      height: 894,
      orientation: 1,
    });
  });

  it("should read the camera orientation of a JPEG", () => {
    // 6 es «girada 90°»: el navegador la endereza al enseñarla y un PDF no.
    expect(readImageHeader(jpeg(4000, 3000, 6)).orientation).toBe(6);
  });

  it("should read the three kinds of WEBP", () => {
    for (const kind of ["VP8X", "VP8L", "VP8 "] as const) {
      expect(readImageHeader(webp(kind, 640, 480))).toMatchObject({
        format: "image/webp",
        width: 640,
        height: 480,
      });
    }
  });

  it("should refuse a file that only claims to be an image", () => {
    // El nombre y el tipo los pone el cliente; la cabecera no.
    expect(() => readImageHeader(bytes("%PDF-1.7 ..."))).toThrow(
      UnsupportedImageFormatError,
    );
  });

  it("should refuse a PNG whose header was cut", () => {
    expect(() => readImageHeader(png(10, 10).subarray(0, 16))).toThrow(
      InvalidImageDimensionsError,
    );
  });

  it("should refuse a JPEG without a frame", () => {
    expect(() => readImageHeader(bytes([0xff, 0xd8, 0xff, 0xd9]))).toThrow(
      InvalidImageDimensionsError,
    );
  });
});
