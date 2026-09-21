import { describe, expect, it } from "vitest";

import { fullImageCrop } from "./crop";
import { createPoster } from "./poster";
import {
  largestSideForResolution,
  posterPixelsPerInch,
  posterSharpness,
  SHARPNESS_THRESHOLDS,
} from "./resolution";

const image = { width: 720, height: 894 };

describe("Poster resolution", () => {
  it("should count the image pixels per inch of paper", () => {
    const crop = fullImageCrop(image);
    // 720 pixels en 254 mm, diez pulgadas.
    const poster = createPoster(crop, { width: 254 });

    expect(posterPixelsPerInch(poster, crop)).toBeCloseTo(72, 6);
  });

  it("should lose resolution when only a part of the image is enlarged", () => {
    const whole = fullImageCrop(image);
    const half = { x: 0, y: 0, width: 360, height: 447 };

    expect(
      posterPixelsPerInch(createPoster(half, { width: 600 }), half),
    ).toBeCloseTo(
      posterPixelsPerInch(createPoster(whole, { width: 600 }), whole) / 2,
      6,
    );
  });

  it("should call a 60 cm poster of a 720 px image pixelated", () => {
    const crop = fullImageCrop(image);
    const poster = createPoster(crop, { width: 600 });

    expect(posterSharpness(posterPixelsPerInch(poster, crop))).toBe(
      "PIXELATED",
    );
  });

  it("should grade sharpness at the thresholds", () => {
    expect(posterSharpness(SHARPNESS_THRESHOLDS.sharp)).toBe("SHARP");
    expect(posterSharpness(SHARPNESS_THRESHOLDS.sharp - 1)).toBe("SOFT");
    expect(posterSharpness(SHARPNESS_THRESHOLDS.soft)).toBe("SOFT");
    expect(posterSharpness(SHARPNESS_THRESHOLDS.soft - 1)).toBe("PIXELATED");
  });

  it("should give the largest side that keeps a resolution", () => {
    const crop = fullImageCrop(image);
    const side = largestSideForResolution(
      crop,
      SHARPNESS_THRESHOLDS.soft,
      "width",
    );

    // 720 / 45 = 16 pulgadas.
    expect(side).toBe(406);
    expect(
      posterPixelsPerInch(createPoster(crop, { width: side }), crop),
    ).toBeGreaterThanOrEqual(SHARPNESS_THRESHOLDS.soft);
  });
});
