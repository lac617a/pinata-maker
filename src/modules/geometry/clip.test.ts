import { describe, expect, it } from "vitest";

import { createBoundingBox } from "./bounding-box";
import { clipPolygonToRectangle } from "./clip";
import { createPoint } from "./point";
import { createPolygon } from "./polygon";

const page = createBoundingBox({ minX: 0, minY: 0, maxX: 100, maxY: 100 });

describe("Clipping", () => {
  it("should return the geometry untouched when it fits entirely inside", () => {
    const contour = createPolygon(
      [createPoint(10, 10), createPoint(90, 10), createPoint(90, 90)],
      true,
    );

    const [clipped] = clipPolygonToRectangle(contour, page);

    expect(clipped).toBe(contour);
    expect(clipped.closed).toBe(true);
  });

  it("should return nothing when the geometry lies completely outside", () => {
    const line = createPolygon(
      [createPoint(200, 200), createPoint(300, 300)],
      false,
    );

    expect(clipPolygonToRectangle(line, page)).toEqual([]);
  });

  it("should cut the geometry exactly at the border", () => {
    const line = createPolygon(
      [createPoint(-50, 50), createPoint(50, 50)],
      false,
    );

    const [clipped] = clipPolygonToRectangle(line, page);

    expect(clipped.points).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 50 },
    ]);
  });

  it("should keep the original coordinates of the portion that stays inside", () => {
    const line = createPolygon(
      [createPoint(20, 30), createPoint(60, 30), createPoint(160, 30)],
      false,
    );

    const [clipped] = clipPolygonToRectangle(line, page);

    expect(clipped.points).toEqual([
      { x: 20, y: 30 },
      { x: 60, y: 30 },
      { x: 100, y: 30 },
    ]);
  });

  it("should split geometry that leaves and re-enters the rectangle", () => {
    const line = createPolygon(
      [
        createPoint(50, 10),
        createPoint(150, 10),
        createPoint(150, 90),
        createPoint(50, 90),
      ],
      false,
    );

    const fragments = clipPolygonToRectangle(line, page);

    expect(fragments).toHaveLength(2);
    expect(fragments[0].points).toEqual([
      { x: 50, y: 10 },
      { x: 100, y: 10 },
    ]);
    expect(fragments[1].points).toEqual([
      { x: 100, y: 90 },
      { x: 50, y: 90 },
    ]);
  });

  it("should open a closed contour that crosses the border", () => {
    const contour = createPolygon(
      [createPoint(50, 50), createPoint(150, 50), createPoint(50, 150)],
      true,
    );

    const fragments = clipPolygonToRectangle(contour, page);

    expect(fragments.every((fragment) => fragment.closed)).toBe(false);
  });

  it("should keep a clipped contour continuous through its closing point", () => {
    const contour = createPolygon(
      [createPoint(50, 50), createPoint(150, 50), createPoint(50, 150)],
      true,
    );

    const fragments = clipPolygonToRectangle(contour, page);

    expect(fragments).toHaveLength(1);
    expect(fragments[0].points).toEqual([
      { x: 50, y: 100 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ]);
  });

  it("should not draw along the border when a figure surrounds the whole rectangle", () => {
    const contour = createPolygon(
      [
        createPoint(-10, -10),
        createPoint(110, -10),
        createPoint(110, 110),
        createPoint(-10, 110),
      ],
      true,
    );

    // La página queda dentro de la figura: no hay ninguna línea que dibujar,
    // pero la hoja sigue siendo necesaria para fabricar la pieza.
    expect(clipPolygonToRectangle(contour, page)).toEqual([]);
  });

  it("should discard a segment that only touches a corner", () => {
    const line = createPolygon(
      [createPoint(150, 50), createPoint(50, 150)],
      false,
    );

    expect(clipPolygonToRectangle(line, page)).toEqual([]);
  });
});
