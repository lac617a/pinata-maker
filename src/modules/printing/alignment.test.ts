import { describe, expect, it } from "vitest";

import { createBoundingBox } from "@/modules/geometry/bounding-box";

import { type AlignmentMark, generateAlignmentMarks } from "./alignment";
import { uniformMargins } from "./margins";
import { paperSize } from "./paper-format";
import { calculatePageLayout, type PrintPageRegion } from "./tiling";

const OVERLAP = 10;

const grid = calculatePageLayout({
  templateBounds: createBoundingBox({
    minX: 0,
    minY: 0,
    maxX: 800,
    maxY: 1000,
  }),
  paper: paperSize("A4", "PORTRAIT"),
  margins: uniformMargins(5),
  overlap: OVERLAP,
});

function pageAt(row: number, column: number): PrintPageRegion {
  const page = grid.pages.find(
    (candidate) => candidate.row === row && candidate.column === column,
  );

  if (!page) throw new Error(`No page at row ${row}, column ${column}.`);

  return page;
}

function marksFor(row: number, column: number): AlignmentMark[] {
  return generateAlignmentMarks({
    page: pageAt(row, column),
    rows: grid.rows,
    columns: grid.columns,
    printableArea: grid.printableArea,
    overlap: OVERLAP,
  });
}

function globalPosition(
  page: PrintPageRegion,
  mark: AlignmentMark,
): { x: number; y: number } {
  return {
    x: page.globalBounds.minX + mark.position.x,
    y: page.globalBounds.minY + mark.position.y,
  };
}

describe("Alignment marks", () => {
  it("should not mark the outer edges of the grid", () => {
    const corner = marksFor(0, 0);

    expect(corner.map((mark) => mark.edge)).toEqual([
      "RIGHT",
      "RIGHT",
      "BOTTOM",
      "BOTTOM",
    ]);
  });

  it("should mark all four edges of an inner page", () => {
    const inner = marksFor(1, 1);

    expect(new Set(inner.map((mark) => mark.edge))).toEqual(
      new Set(["TOP", "RIGHT", "BOTTOM", "LEFT"]),
    );
    expect(inner).toHaveLength(8);
  });

  it("should place two marks per shared edge so the sheet cannot be rotated", () => {
    const rightMarks = marksFor(0, 0).filter((mark) => mark.edge === "RIGHT");

    expect(rightMarks).toHaveLength(2);
    expect(rightMarks[0].position.y).not.toBe(rightMarks[1].position.y);
  });

  it("should give both sides of a shared edge the same identity", () => {
    const fromLeftPage = marksFor(0, 0)
      .filter((mark) => mark.edge === "RIGHT")
      .map((mark) => mark.id);

    const fromRightPage = marksFor(0, 1)
      .filter((mark) => mark.edge === "LEFT")
      .map((mark) => mark.id);

    expect(fromLeftPage).toEqual(["A1-A2-1", "A1-A2-2"]);
    expect(fromRightPage).toEqual(fromLeftPage);
  });

  it("should print the same mark at the same physical position on both sheets", () => {
    const leftPage = pageAt(0, 0);
    const rightPage = pageAt(0, 1);

    const onLeft = marksFor(0, 0).filter((mark) => mark.edge === "RIGHT");
    const onRight = marksFor(0, 1).filter((mark) => mark.edge === "LEFT");

    expect(onLeft.map((mark) => globalPosition(leftPage, mark))).toEqual(
      onRight.map((mark) => globalPosition(rightPage, mark)),
    );
  });

  it("should match vertically adjacent pages as well", () => {
    const topPage = pageAt(0, 0);
    const bottomPage = pageAt(1, 0);

    const onTop = marksFor(0, 0).filter((mark) => mark.edge === "BOTTOM");
    const onBottom = marksFor(1, 0).filter((mark) => mark.edge === "TOP");

    expect(onTop[0].id).toBe("A1-B1-1");
    expect(onTop.map((mark) => globalPosition(topPage, mark))).toEqual(
      onBottom.map((mark) => globalPosition(bottomPage, mark)),
    );
  });

  it("should name the page each mark connects to", () => {
    const marks = marksFor(1, 1);

    expect(marks.find((mark) => mark.edge === "TOP")?.connectsTo).toBe("A2");
    expect(marks.find((mark) => mark.edge === "LEFT")?.connectsTo).toBe("B1");
  });

  it("should keep every mark inside the printable area", () => {
    for (const mark of marksFor(1, 1)) {
      expect(mark.position.x).toBeGreaterThanOrEqual(0);
      expect(mark.position.y).toBeGreaterThanOrEqual(0);
      expect(mark.position.x).toBeLessThanOrEqual(grid.printableArea.width);
      expect(mark.position.y).toBeLessThanOrEqual(grid.printableArea.height);
    }
  });
});
