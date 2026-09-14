import { describe, expect, it } from "vitest";

import { InvalidContourError } from "./errors";
import { simplifyPixelContour } from "./simplification";

describe("Contour simplification", () => {
  it("should remove points that lie along a straight line", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];

    expect(simplifyPixelContour(line, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ]);
  });

  it("should keep the corners of the figure", () => {
    const squareWithMidpoints = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
      { x: 50, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 50 },
    ];

    expect(simplifyPixelContour(squareWithMidpoints, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 50 },
    ]);
  });

  it("should keep a detail that deviates more than the tolerance", () => {
    const withBump = [
      { x: 0, y: 0 },
      { x: 50, y: 5 },
      { x: 100, y: 0 },
    ];

    expect(simplifyPixelContour(withBump, 2)).toHaveLength(3);
    expect(simplifyPixelContour(withBump, 10)).toHaveLength(2);
  });

  it("should return the contour untouched when the tolerance is zero", () => {
    const contour = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];

    expect(simplifyPixelContour(contour, 0)).toEqual(contour);
  });

  it("should produce the same result for the same input", () => {
    const contour = Array.from({ length: 50 }, (_, index) => ({
      x: index,
      y: index % 2,
    }));

    expect(simplifyPixelContour(contour, 0.75)).toEqual(
      simplifyPixelContour(contour, 0.75),
    );
  });

  it("should reject a negative tolerance", () => {
    expect(() =>
      simplifyPixelContour(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 20, y: 0 },
        ],
        -1,
      ),
    ).toThrow(InvalidContourError);
  });
});
