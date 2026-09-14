import { describe, expect, it } from "vitest";

import { createDimensions } from "./dimensions";
import { InvalidScaleError } from "./errors";
import { fitToDimensions, scaleDimensions } from "./scale";

describe("Scale", () => {
  it("should multiply both axes by the same factor", () => {
    const scaled = scaleDimensions(createDimensions(400, 500), 2);

    expect(scaled).toEqual({ width: 800, height: 1000 });
  });

  it("should return an equivalent size when scaling by 1", () => {
    const original = createDimensions(215.9, 279.4);

    expect(scaleDimensions(original, 1)).toEqual(original);
  });

  it("should reject a scale of zero or less", () => {
    const dimensions = createDimensions(400, 500);

    expect(() => scaleDimensions(dimensions, 0)).toThrow(InvalidScaleError);
    expect(() => scaleDimensions(dimensions, -2)).toThrow(InvalidScaleError);
  });
});

describe("fitToDimensions", () => {
  it("should reach the target exactly when the aspect ratio matches", () => {
    const fit = fitToDimensions(
      createDimensions(400, 500),
      createDimensions(800, 1000),
    );

    expect(fit.scale).toBe(2);
    expect(fit.dimensions).toEqual({ width: 800, height: 1000 });
    expect(fit.requiresDistortionForExactFit).toBe(false);
  });

  it("should use the smaller axis factor so the result fits inside the target", () => {
    const fit = fitToDimensions(
      createDimensions(400, 500),
      createDimensions(800, 900),
    );

    expect(fit.scale).toBeCloseTo(1.8, 10);
    expect(fit.dimensions.width).toBeCloseTo(720, 10);
    expect(fit.dimensions.height).toBeCloseTo(900, 10);
  });

  it("should report that reaching both target dimensions would distort the figure", () => {
    const fit = fitToDimensions(
      createDimensions(400, 500),
      createDimensions(800, 900),
    );

    expect(fit.requiresDistortionForExactFit).toBe(true);
  });

  it("should preserve the aspect ratio of the source", () => {
    const source = createDimensions(2000, 2500);
    const fit = fitToDimensions(source, createDimensions(400, 500));

    expect(fit.dimensions.width / fit.dimensions.height).toBeCloseTo(
      source.width / source.height,
      10,
    );
  });
});
