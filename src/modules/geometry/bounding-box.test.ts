import { describe, expect, it } from "vitest";

import {
  boundingBoxDimensions,
  boundingBoxFromPoints,
  createBoundingBox,
} from "./bounding-box";
import { InvalidDimensionsError, InvalidGeometryError } from "./errors";
import { createPoint } from "./point";

describe("BoundingBox", () => {
  it("should calculate its physical dimensions from its bounds", () => {
    const bounds = createBoundingBox({
      minX: 100,
      minY: 50,
      maxX: 900,
      maxY: 1050,
    });

    expect(boundingBoxDimensions(bounds)).toEqual({
      width: 800,
      height: 1000,
    });
  });

  it("should derive bounds that contain every point", () => {
    const bounds = boundingBoxFromPoints([
      createPoint(10, 40),
      createPoint(-5, 120),
      createPoint(60, 0),
    ]);

    expect(bounds).toEqual({ minX: -5, minY: 0, maxX: 60, maxY: 120 });
  });

  it("should reject bounds whose minimum exceeds its maximum", () => {
    expect(() =>
      createBoundingBox({ minX: 900, minY: 0, maxX: 100, maxY: 100 }),
    ).toThrow(InvalidGeometryError);
  });

  it("should reject non-finite coordinates", () => {
    expect(() =>
      createBoundingBox({
        minX: 0,
        minY: 0,
        maxX: Number.NaN,
        maxY: 100,
      }),
    ).toThrow(InvalidGeometryError);
  });

  it("should reject deriving bounds from an empty set of points", () => {
    expect(() => boundingBoxFromPoints([])).toThrow(InvalidGeometryError);
  });

  it("should reject asking for the dimensions of a degenerate box", () => {
    const line = createBoundingBox({ minX: 0, minY: 0, maxX: 0, maxY: 100 });

    expect(() => boundingBoxDimensions(line)).toThrow(InvalidDimensionsError);
  });
});
