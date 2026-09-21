import { describe, expect, it } from "vitest";

import { createDimensions } from "@/modules/geometry/dimensions";

import { convertContourToPhysicalGeometry } from "./contour-to-geometry";
import { InvalidContourError } from "./errors";
import type { PixelPoint } from "./pixel-contour";

/** Rectángulo de 200 × 100 px situado lejos del origen de la imagen. */
const figureInImage: PixelPoint[] = [
  { x: 500, y: 300 },
  { x: 700, y: 300 },
  { x: 700, y: 400 },
  { x: 500, y: 400 },
];

describe("Contour to physical geometry", () => {
  it("should scale using the size of the figure, not the image canvas", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.millimetersPerPixel).toBe(4);
    expect(result.polygon.points).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 400 },
      { x: 0, y: 400 },
    ]);
  });

  it("should place the figure at the origin regardless of where it sat in the image", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(Math.min(...result.polygon.points.map((point) => point.x))).toBe(0);
    expect(Math.min(...result.polygon.points.map((point) => point.y))).toBe(0);
  });

  it("should preserve the aspect ratio of the figure", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.dimensions.width / result.dimensions.height).toBeCloseTo(
      200 / 100,
      10,
    );
  });

  it("should report when reaching both requested dimensions would distort the figure", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.requiresDistortionForExactFit).toBe(true);
    expect(result.dimensions).toEqual({ width: 800, height: 400 });
  });

  it("should reach the requested dimensions exactly when the ratio matches", () => {
    const result = convertContourToPhysicalGeometry({
      contour: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 250 },
        { x: 0, y: 250 },
      ],
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.dimensions).toEqual({ width: 800, height: 1000 });
    expect(result.requiresDistortionForExactFit).toBe(false);
  });

  it("should produce the same physical geometry from a higher resolution image", () => {
    const target = createDimensions(800, 1000);

    const lowResolution = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: target,
    });

    const highResolution = convertContourToPhysicalGeometry({
      contour: figureInImage.map((point) => ({
        x: point.x * 4,
        y: point.y * 4,
      })),
      targetDimensions: target,
    });

    expect(highResolution.polygon.points).toEqual(lowResolution.polygon.points);
    expect(highResolution.dimensions).toEqual(lowResolution.dimensions);
  });

  it("should close the resulting contour", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.polygon.closed).toBe(true);
  });

  it("should reduce redundant points using the physical tolerance", () => {
    const noisyEdge: PixelPoint[] = [
      ...Array.from({ length: 100 }, (_, index) => ({ x: index * 2, y: 0 })),
      { x: 200, y: 100 },
      { x: 0, y: 100 },
    ];

    const result = convertContourToPhysicalGeometry({
      contour: noisyEdge,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.polygon.points.length).toBeLessThan(noisyEdge.length);
    expect(result.dimensions).toEqual({ width: 800, height: 400 });
  });

  it("should reject a contour that a huge tolerance would erase", () => {
    expect(() =>
      convertContourToPhysicalGeometry({
        contour: figureInImage,
        targetDimensions: createDimensions(800, 1000),
        simplificationTolerance: 10_000,
      }),
    ).toThrow(InvalidContourError);
  });

  it("should not try to refine the contour below the resolution of the image", () => {
    // Un borde diagonal recorrido pixel a pixel: cien escalones que la
    // imagen no distingue de una recta.
    const staircase: PixelPoint[] = [
      { x: 0, y: 0 },
      ...Array.from({ length: 100 }, (_, step) => [
        { x: step, y: step },
        { x: step + 1, y: step },
      ]).flat(),
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    const result = convertContourToPhysicalGeometry({
      contour: staircase,
      targetDimensions: createDimensions(1000, 1000),
      simplificationTolerance: 0.5,
    });

    // A 10 mm por pixel, medio milímetro es la vigésima parte de un escalón:
    // respetarlo dejaría el contorno hecho una escalera y el perímetro sería
    // la mitad más largo que la figura.
    expect(result.appliedSimplificationTolerance).toBeGreaterThan(0.5);
    expect(result.polygon.points.length).toBeLessThan(10);
  });

  it("should respect a tolerance the image can resolve", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
      simplificationTolerance: 20,
    });

    expect(result.appliedSimplificationTolerance).toBe(20);
  });

  it("should identify the processor version that produced the geometry", () => {
    const result = convertContourToPhysicalGeometry({
      contour: figureInImage,
      targetDimensions: createDimensions(800, 1000),
    });

    expect(result.processorVersion).toBe("1.0");
  });
});
