import { describe, expect, it } from "vitest";

import { EmptyMaskError, InvalidImageDimensionsError } from "./errors";
import {
  createAlphaMask,
  DEFAULT_ALPHA_THRESHOLD,
  foregroundPixelCount,
  isForeground,
  thresholdAlphaMask,
} from "./mask";

/** Cuatro pixels con distintos grados de opacidad. */
const alphaMask = createAlphaMask(2, 2, new Uint8Array([0, 60, 200, 255]));

describe("Alpha mask", () => {
  it("should reject a buffer that does not match the size of the image", () => {
    expect(() => createAlphaMask(2, 2, new Uint8Array(3))).toThrow(
      InvalidImageDimensionsError,
    );
  });

  it("should treat a pixel more opaque than transparent as part of the figure", () => {
    const binary = thresholdAlphaMask(alphaMask);

    expect(isForeground(binary, 0, 1)).toBe(true);
    expect(isForeground(binary, 1, 1)).toBe(true);
    expect(foregroundPixelCount(binary)).toBe(2);
  });

  it("should leave the antialiased edge out of the figure", () => {
    // Con alpha 60 el pixel es más transparente que opaco: contarlo como
    // figura agrandaría la pieza por el borde.
    const binary = thresholdAlphaMask(alphaMask);

    expect(isForeground(binary, 1, 0)).toBe(false);
  });

  it("should let the threshold be configured", () => {
    const permissive = thresholdAlphaMask(alphaMask, 50);

    expect(foregroundPixelCount(permissive)).toBe(3);
    expect(DEFAULT_ALPHA_THRESHOLD).toBe(128);
  });

  it("should report an image with no figure instead of an empty mask", () => {
    const transparent = createAlphaMask(2, 2, new Uint8Array([0, 0, 0, 0]));

    expect(() => thresholdAlphaMask(transparent)).toThrow(EmptyMaskError);
  });

  it("should reject a threshold outside the alpha channel", () => {
    expect(() => thresholdAlphaMask(alphaMask, 0)).toThrow(
      InvalidImageDimensionsError,
    );
    expect(() => thresholdAlphaMask(alphaMask, 256)).toThrow(
      InvalidImageDimensionsError,
    );
  });

  it("should place no figure outside the bounds of the image", () => {
    const binary = thresholdAlphaMask(alphaMask);

    expect(isForeground(binary, -1, 0)).toBe(false);
    expect(isForeground(binary, 0, 2)).toBe(false);
  });
});
