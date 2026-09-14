import { describe, expect, it } from "vitest";

import { createDimensions } from "./dimensions";
import { InvalidDimensionsError } from "./errors";

describe("Dimensions", () => {
  it("should keep the physical size it was created with", () => {
    const dimensions = createDimensions(800, 1000);

    expect(dimensions).toEqual({ width: 800, height: 1000 });
  });

  it("should reject a width of zero because it has no printable surface", () => {
    expect(() => createDimensions(0, 1000)).toThrow(InvalidDimensionsError);
  });

  it("should reject negative dimensions", () => {
    expect(() => createDimensions(800, -1)).toThrow(InvalidDimensionsError);
  });

  it("should reject non-finite dimensions", () => {
    expect(() => createDimensions(Number.NaN, 1000)).toThrow(
      InvalidDimensionsError,
    );
    expect(() => createDimensions(800, Number.POSITIVE_INFINITY)).toThrow(
      InvalidDimensionsError,
    );
  });
});
