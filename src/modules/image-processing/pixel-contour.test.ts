import { describe, expect, it } from "vitest";

import { InvalidContourError } from "./errors";
import {
  cleanPixelContour,
  pixelContourBounds,
  pixelContourSize,
} from "./pixel-contour";

const square = [
  { x: 10, y: 10 },
  { x: 60, y: 10 },
  { x: 60, y: 40 },
  { x: 10, y: 40 },
];

describe("Contour cleanup", () => {
  it("should remove consecutive duplicate points", () => {
    const cleaned = cleanPixelContour([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);

    expect(cleaned).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
  });

  it("should drop the repeated closing point some extractors append", () => {
    const cleaned = cleanPixelContour([...square, { x: 10, y: 10 }]);

    expect(cleaned).toEqual(square);
  });

  it("should reject non-finite coordinates instead of repairing them", () => {
    expect(() =>
      cleanPixelContour([...square, { x: Number.NaN, y: 0 }]),
    ).toThrow(InvalidContourError);
  });

  it("should reject a contour with fewer than three distinct points", () => {
    expect(() =>
      cleanPixelContour([
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]),
    ).toThrow(InvalidContourError);
  });
});

describe("Contour bounds", () => {
  it("should measure the area the figure occupies in the image", () => {
    expect(pixelContourBounds(square)).toEqual({
      minX: 10,
      minY: 10,
      maxX: 60,
      maxY: 40,
    });
    expect(pixelContourSize(pixelContourBounds(square))).toEqual({
      width: 50,
      height: 30,
    });
  });

  it("should reject a flat contour because it has no surface", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];

    expect(() => pixelContourSize(pixelContourBounds(line))).toThrow(
      InvalidContourError,
    );
  });
});
