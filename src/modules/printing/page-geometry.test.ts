import { describe, expect, it } from "vitest";

import { createBoundingBox } from "@/modules/geometry/bounding-box";
import { createPoint } from "@/modules/geometry/point";
import { createPolygon } from "@/modules/geometry/polygon";
import {
  createTemplateGeometry,
  isTemplateGeometryEmpty,
} from "@/modules/geometry/template-geometry";

import { uniformMargins } from "./margins";
import { clipGeometryToPage } from "./page-geometry";
import { paperSize } from "./paper-format";
import { calculatePageLayout, type PrintPageRegion } from "./tiling";

function layoutFor(width: number, height: number) {
  return calculatePageLayout({
    templateBounds: createBoundingBox({
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height,
    }),
    paper: paperSize("A4", "PORTRAIT"),
    margins: uniformMargins(5),
    overlap: 10,
  });
}

function pageAt(
  pages: readonly PrintPageRegion[],
  row: number,
  column: number,
): PrintPageRegion {
  const page = pages.find(
    (candidate) => candidate.row === row && candidate.column === column,
  );

  if (!page) throw new Error(`No page at row ${row}, column ${column}.`);

  return page;
}

describe("Page geometry", () => {
  it("should express the geometry in coordinates local to the page origin", () => {
    const layout = layoutFor(600, 400);
    const secondColumn = pageAt(layout.pages, 0, 1);

    const geometry = createTemplateGeometry({
      foldLines: [
        {
          geometry: createPolygon(
            [createPoint(250, 200), createPoint(350, 200)],
            false,
          ),
        },
      ],
    });

    const pageGeometry = clipGeometryToPage(geometry, secondColumn);

    expect(secondColumn.globalBounds.minX).toBe(190);
    expect(pageGeometry.foldLines[0].geometry.points).toEqual([
      { x: 60, y: 200 },
      { x: 160, y: 200 },
    ]);
  });

  it("should keep the physical length of a line that stays inside the page", () => {
    const layout = layoutFor(600, 400);
    const firstPage = layout.pages[0];

    const geometry = createTemplateGeometry({
      cutLines: [
        {
          geometry: createPolygon(
            [createPoint(20, 30), createPoint(120, 30)],
            false,
          ),
        },
      ],
    });

    const [line] = clipGeometryToPage(geometry, firstPage).cutLines;
    const [start, end] = line.geometry.points;

    expect(end.x - start.x).toBe(100);
  });

  it("should place the overlapping strip on both adjacent pages", () => {
    const layout = layoutFor(600, 400);
    const first = pageAt(layout.pages, 0, 0);
    const second = pageAt(layout.pages, 0, 1);

    const geometry = createTemplateGeometry({
      cutLines: [
        {
          geometry: createPolygon(
            [createPoint(150, 50), createPoint(250, 50)],
            false,
          ),
        },
      ],
    });

    const onFirst = clipGeometryToPage(geometry, first).cutLines[0];
    const onSecond = clipGeometryToPage(geometry, second).cutLines[0];

    // La franja global 190–200 mm pertenece a las dos hojas.
    expect(onFirst.geometry.points).toEqual([
      { x: 150, y: 50 },
      { x: 200, y: 50 },
    ]);
    expect(onSecond.geometry.points).toEqual([
      { x: 0, y: 50 },
      { x: 60, y: 50 },
    ]);
  });

  it("should keep cut lines and fold lines apart after clipping", () => {
    const layout = layoutFor(600, 400);

    const geometry = createTemplateGeometry({
      cutLines: [
        {
          geometry: createPolygon(
            [createPoint(10, 10), createPoint(150, 10)],
            false,
          ),
        },
      ],
      foldLines: [
        {
          geometry: createPolygon(
            [createPoint(10, 20), createPoint(150, 20)],
            false,
          ),
        },
      ],
    });

    const pageGeometry = clipGeometryToPage(geometry, layout.pages[0]);

    expect(pageGeometry.cutLines).toHaveLength(1);
    expect(pageGeometry.foldLines).toHaveLength(1);
    expect(pageGeometry.cutLines[0].geometry.points[0].y).toBe(10);
    expect(pageGeometry.foldLines[0].geometry.points[0].y).toBe(20);
  });

  it("should produce an empty page geometry where the figure does not reach", () => {
    const layout = layoutFor(600, 400);
    const lastPage = layout.pages[layout.pages.length - 1];

    const geometry = createTemplateGeometry({
      outerContours: [
        createPolygon(
          [createPoint(0, 0), createPoint(60, 0), createPoint(60, 60)],
          true,
        ),
      ],
    });

    expect(
      isTemplateGeometryEmpty(clipGeometryToPage(geometry, lastPage)),
    ).toBe(true);
  });

  it("should keep a contour that fits in a single page closed", () => {
    const layout = layoutFor(600, 400);

    const contour = createPolygon(
      [createPoint(10, 10), createPoint(120, 10), createPoint(120, 90)],
      true,
    );

    const pageGeometry = clipGeometryToPage(
      createTemplateGeometry({ outerContours: [contour] }),
      layout.pages[0],
    );

    expect(pageGeometry.outerContours[0].closed).toBe(true);
  });
});
