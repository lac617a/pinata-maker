import { describe, expect, it } from "vitest";

import { boundingBoxDimensions } from "./bounding-box";
import { InvalidGeometryError } from "./errors";
import { createPoint } from "./point";
import {
  createPolygon,
  polygonBounds,
  polygonSegments,
  translatePolygon,
} from "./polygon";

const triangle = [createPoint(0, 0), createPoint(100, 0), createPoint(0, 80)];

describe("Polygon", () => {
  it("should require at least three points to enclose a surface", () => {
    expect(() =>
      createPolygon([createPoint(0, 0), createPoint(100, 0)], true),
    ).toThrow(InvalidGeometryError);
  });

  it("should accept two points for an open polyline", () => {
    const line = createPolygon([createPoint(0, 0), createPoint(100, 0)], false);

    expect(line.closed).toBe(false);
  });

  it("should reject non-finite coordinates", () => {
    expect(() =>
      createPolygon(
        [createPoint(0, 0), createPoint(100, 0), { x: Number.NaN, y: 0 }],
        true,
      ),
    ).toThrow(InvalidGeometryError);
  });

  it("should include the closing segment only when the polygon is closed", () => {
    expect(polygonSegments(createPolygon(triangle, true))).toHaveLength(3);
    expect(polygonSegments(createPolygon(triangle, false))).toHaveLength(2);
  });

  it("should keep its physical size when translated", () => {
    const original = createPolygon(triangle, true);
    const moved = translatePolygon(original, { x: 50, y: -20 });

    expect(boundingBoxDimensions(polygonBounds(moved))).toEqual(
      boundingBoxDimensions(polygonBounds(original)),
    );
    expect(polygonBounds(moved).minX).toBe(50);
    expect(polygonBounds(moved).minY).toBe(-20);
  });

  it("should not modify the original polygon when translated", () => {
    const original = createPolygon(triangle, true);

    translatePolygon(original, { x: 50, y: 50 });

    expect(original.points).toEqual(triangle);
  });
});
