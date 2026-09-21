import { describe, expect, it } from "vitest";

import { InvalidImageDimensionsError } from "./errors";
import { alphaMaskFromRgba, maskIsFullyOpaque } from "./rgba-mask";

/** Imagen de 2 × 2 con el alfa que se le pida, pixel a pixel. */
function rgba(alphas: number[]): Uint8Array {
  const bytes = new Uint8Array(alphas.length * 4);

  alphas.forEach((alpha, pixel) => {
    bytes[pixel * 4] = 10;
    bytes[pixel * 4 + 1] = 20;
    bytes[pixel * 4 + 2] = 30;
    bytes[pixel * 4 + 3] = alpha;
  });

  return bytes;
}

describe("Alpha mask from RGBA", () => {
  it("should keep only the alpha channel", () => {
    const mask = alphaMaskFromRgba({
      width: 2,
      height: 2,
      rgba: rgba([0, 64, 200, 255]),
    });

    // El color no dice nada de la figura: lo que recorta es la transparencia.
    expect([...mask.alpha]).toEqual([0, 64, 200, 255]);
    expect(mask.width).toBe(2);
    expect(mask.height).toBe(2);
  });

  it("should read the pixels in row order", () => {
    const mask = alphaMaskFromRgba({
      width: 3,
      height: 1,
      rgba: rgba([1, 2, 3]),
    });

    expect([...mask.alpha]).toEqual([1, 2, 3]);
  });

  it("should accept the clamped array a canvas returns", () => {
    const mask = alphaMaskFromRgba({
      width: 1,
      height: 1,
      rgba: new Uint8ClampedArray([0, 0, 0, 128]),
    });

    expect([...mask.alpha]).toEqual([128]);
  });

  it("should refuse a buffer that does not match the size", () => {
    // Cuatro bytes por pixel. Si no cuadra, lo que llegó no es esta imagen y
    // seguir produciría una máscara desplazada.
    expect(() =>
      alphaMaskFromRgba({ width: 2, height: 2, rgba: rgba([0, 0, 0]) }),
    ).toThrow(InvalidImageDimensionsError);
  });

  it("should report an image without any transparency", () => {
    // Sin fondo que descartar, la silueta sería el rectángulo entero.
    expect(
      maskIsFullyOpaque(
        alphaMaskFromRgba({ width: 2, height: 1, rgba: rgba([255, 255]) }),
      ),
    ).toBe(true);
  });

  it("should not report an image with a transparent corner", () => {
    expect(
      maskIsFullyOpaque(
        alphaMaskFromRgba({ width: 2, height: 1, rgba: rgba([255, 0]) }),
      ),
    ).toBe(false);
  });
});
