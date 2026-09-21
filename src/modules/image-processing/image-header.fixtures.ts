/**
 * Cabecera PNG válida, para las pruebas que suben imágenes.
 *
 * Desde que la subida lee la cabecera (docs/image-processing.md §110), unos
 * bytes cualesquiera ya no pasan por una imagen. Esto es lo mínimo que la
 * validación necesita ver: firma, IHDR y dimensiones.
 */
export function pngHeader(
  width = 400,
  height = 400,
  byteSize = 64,
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(Math.max(byteSize, 33));
  const view = new DataView(bytes.buffer);

  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  view.setUint32(8, 13);
  bytes.set(
    [..."IHDR"].map((c) => c.charCodeAt(0)),
    12,
  );
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([8, 6, 0, 0, 0], 24);

  return bytes;
}

/** Cabecera JPEG con su bloque EXIF, para probar la orientación de cámara. */
export function jpegHeader(
  width = 400,
  height = 400,
  orientation = 1,
): Uint8Array<ArrayBuffer> {
  const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
  const be32 = (n: number) => [
    n >>> 24,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ];
  const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    ...be16(2 + 6 + 8 + 2 + 12),
    ...text("Exif"),
    0,
    0,
    ...text("MM"),
    ...be16(42),
    ...be32(8),
    ...be16(1),
    ...be16(0x0112),
    ...be16(3),
    ...be32(1),
    ...be16(orientation),
    0,
    0,
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
