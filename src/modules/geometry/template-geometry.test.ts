import { describe, expect, it } from "vitest";

import { InvalidGeometryError } from "./errors";
import { createPoint } from "./point";
import { createPolygon } from "./polygon";
import {
  createTemplateGeometry,
  isTemplateGeometryEmpty,
  templateGeometryBounds,
} from "./template-geometry";

const contour = createPolygon(
  [createPoint(0, 0), createPoint(100, 0), createPoint(100, 80)],
  true,
);

const foldLine = createPolygon(
  [createPoint(20, 120), createPoint(80, 120)],
  false,
);

describe("TemplateGeometry", () => {
  it("should reject an open outer contour because it cannot delimit a piece", () => {
    const open = createPolygon(
      [createPoint(0, 0), createPoint(100, 0), createPoint(100, 80)],
      false,
    );

    expect(() => createTemplateGeometry({ outerContours: [open] })).toThrow(
      InvalidGeometryError,
    );
  });

  it("should reject an open hole", () => {
    const open = createPolygon(
      [createPoint(10, 10), createPoint(20, 10)],
      false,
    );

    expect(() => createTemplateGeometry({ holes: [open] })).toThrow(
      InvalidGeometryError,
    );
  });

  it("should treat missing line collections as empty", () => {
    const geometry = createTemplateGeometry({ outerContours: [contour] });

    expect(geometry.holes).toEqual([]);
    expect(geometry.cutLines).toEqual([]);
    expect(geometry.foldLines).toEqual([]);
  });

  it("should derive its bounds from every kind of line, not only the contour", () => {
    const geometry = createTemplateGeometry({
      outerContours: [contour],
      foldLines: [{ geometry: foldLine }],
    });

    expect(templateGeometryBounds(geometry)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 120,
    });
  });

  it("should reject asking for the bounds of an empty geometry", () => {
    expect(() => templateGeometryBounds(createTemplateGeometry({}))).toThrow(
      InvalidGeometryError,
    );
  });

  it("should report whether it contains any geometry", () => {
    expect(isTemplateGeometryEmpty(createTemplateGeometry({}))).toBe(true);
    expect(
      isTemplateGeometryEmpty(
        createTemplateGeometry({ foldLines: [{ geometry: foldLine }] }),
      ),
    ).toBe(false);
  });
});
