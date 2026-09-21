import { describe, expect, it } from "vitest";

import {
  canSendAsIs,
  encodeAttempts,
  preparedFileName,
  UPLOAD_PREPARATION,
} from "./upload-preparation";

const MB = 1024 * 1024;

describe("Upload preparation", () => {
  it("should send a light, small image untouched", () => {
    expect(canSendAsIs({ byteSize: 0.5 * MB, width: 720, height: 894 })).toBe(
      true,
    );
  });

  it("should shrink a phone photo that weighs too much", () => {
    // Una foto típica de móvil: 12 MP y 6 MB.
    expect(canSendAsIs({ byteSize: 6 * MB, width: 4000, height: 3000 })).toBe(
      false,
    );
  });

  it("should shrink an image with too many pixels even if it is light", () => {
    // Un PNG plano de 8000 px puede pesar poco y aun así sobrar.
    expect(canSendAsIs({ byteSize: 1 * MB, width: 8000, height: 6000 })).toBe(
      false,
    );
  });

  it("should start at the largest side allowed, keeping the proportion", () => {
    const [first] = encodeAttempts({ width: 8000, height: 6000 });

    expect(first).toEqual({ width: 4096, height: 3072, quality: 0.9 });
  });

  it("should not enlarge an image that only weighs too much", () => {
    const [first] = encodeAttempts({ width: 3000, height: 4000 });

    expect(first).toEqual({ width: 3000, height: 4000, quality: 0.9 });
  });

  it("should go lighter at every step and stop at the smallest side", () => {
    const attempts = encodeAttempts({ width: 8000, height: 6000 });
    const sides = attempts.map((a) => Math.max(a.width, a.height));

    for (let i = 1; i < sides.length; i++) {
      expect(sides[i]).toBeLessThanOrEqual(sides[i - 1]);
    }
    expect(sides.at(-1)).toBe(UPLOAD_PREPARATION.minSide);
    expect(attempts[1].quality).toBeLessThan(attempts[0].quality);
  });

  it("should never shrink a small image below its own size", () => {
    const attempts = encodeAttempts({ width: 900, height: 700 });

    expect(Math.min(...attempts.map((a) => a.width))).toBe(900);
  });

  it("should name the file after the original with the new format", () => {
    expect(preparedFileName("foto de Ana.HEIC.webp", "image/jpeg")).toBe(
      "foto de Ana.HEIC.jpg",
    );
    expect(preparedFileName("dibujo.png", "image/png")).toBe("dibujo.png");
    expect(preparedFileName(".png", "image/jpeg")).toBe("imagen.jpg");
  });
});
