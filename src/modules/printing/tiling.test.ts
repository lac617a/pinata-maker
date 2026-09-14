import { describe, expect, it } from "vitest";

import {
  boundingBoxDimensions,
  createBoundingBox,
  type BoundingBox,
} from "../geometry/bounding-box";
import { InvalidOverlapError } from "./errors";
import { uniformMargins } from "./margins";
import { paperSize } from "./paper-format";
import { calculatePageLayout, type PageLayoutInput } from "./tiling";

function templateBounds(
  width: number,
  height: number,
  origin = { x: 0, y: 0 },
): BoundingBox {
  return createBoundingBox({
    minX: origin.x,
    minY: origin.y,
    maxX: origin.x + width,
    maxY: origin.y + height,
  });
}

function a4Layout(
  bounds: BoundingBox,
  overlap = 10,
): ReturnType<typeof calculatePageLayout> {
  return calculatePageLayout({
    templateBounds: bounds,
    paper: paperSize("A4", "PORTRAIT"),
    margins: uniformMargins(5),
    overlap,
  });
}

describe("Page count", () => {
  it("should produce a single page when the template is smaller than the printable area", () => {
    const layout = a4Layout(templateBounds(150, 200));

    expect(layout.pages).toHaveLength(1);
    expect(layout.rows).toBe(1);
    expect(layout.columns).toBe(1);
  });

  it("should produce a single page when the template matches the printable area exactly", () => {
    const layout = a4Layout(templateBounds(200, 287));

    expect(layout.pages).toHaveLength(1);
  });

  it("should produce a second page when the template is slightly larger than the printable area", () => {
    const layout = a4Layout(templateBounds(201, 287));

    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(1);
  });

  it("should split a template much larger than the sheet into a full grid", () => {
    const layout = a4Layout(templateBounds(800, 1000));

    expect(layout.columns).toBe(5);
    expect(layout.rows).toBe(4);
    expect(layout.pages).toHaveLength(20);
  });

  it("should need fewer pages on a larger paper format", () => {
    const bounds = templateBounds(800, 1000);

    const a3 = calculatePageLayout({
      templateBounds: bounds,
      paper: paperSize("A3", "PORTRAIT"),
      margins: uniformMargins(5),
      overlap: 10,
    });

    expect(a3.pages.length).toBeLessThan(a4Layout(bounds).pages.length);
    expect(a3.columns).toBe(3);
    expect(a3.rows).toBe(3);
  });

  it("should need more pages when the margins grow", () => {
    const bounds = templateBounds(800, 1000);

    const wideMargins = calculatePageLayout({
      templateBounds: bounds,
      paper: paperSize("A4", "PORTRAIT"),
      margins: uniformMargins(25),
      overlap: 10,
    });

    expect(wideMargins.pages.length).toBeGreaterThan(
      a4Layout(bounds).pages.length,
    );
  });
});

describe("Page ordering", () => {
  it("should number pages from top to bottom and left to right", () => {
    const layout = a4Layout(templateBounds(500, 600));

    expect(layout.pages.map((page) => page.pageNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(layout.pages.map((page) => `${page.row}${page.column}`)).toEqual([
      "00",
      "01",
      "02",
      "10",
      "11",
      "12",
      "20",
      "21",
      "22",
    ]);
  });

  it("should label rows with letters and columns with numbers", () => {
    const layout = a4Layout(templateBounds(500, 600));

    expect(layout.pages.map((page) => page.label)).toEqual([
      "A1",
      "A2",
      "A3",
      "B1",
      "B2",
      "B3",
      "C1",
      "C2",
      "C3",
    ]);
  });

  it("should produce an identical layout for identical input", () => {
    const input: PageLayoutInput = {
      templateBounds: templateBounds(800, 1000),
      paper: paperSize("A4", "PORTRAIT"),
      margins: uniformMargins(5),
      overlap: 10,
    };

    expect(calculatePageLayout(input)).toEqual(calculatePageLayout(input));
  });
});

describe("Overlap", () => {
  it("should make adjacent pages share exactly the configured overlap", () => {
    const layout = a4Layout(templateBounds(800, 1000), 10);

    const [first, second] = layout.pages;
    const below = layout.pages[layout.columns];

    expect(first.globalBounds.maxX - second.globalBounds.minX).toBeCloseTo(
      10,
      10,
    );
    expect(first.globalBounds.maxY - below.globalBounds.minY).toBeCloseTo(
      10,
      10,
    );
  });

  it("should make adjacent pages meet without sharing material when there is no overlap", () => {
    const layout = a4Layout(templateBounds(800, 1000), 0);

    const [first, second] = layout.pages;

    expect(second.globalBounds.minX).toBeCloseTo(first.globalBounds.maxX, 10);
    expect(layout.step).toEqual(layout.printableArea);
  });

  it("should not change the physical size of the template when the overlap grows", () => {
    const bounds = templateBounds(800, 1000);

    const withoutOverlap = a4Layout(bounds, 0);
    const withOverlap = a4Layout(bounds, 20);

    expect(boundingBoxDimensions(bounds)).toEqual({ width: 800, height: 1000 });
    expect(withOverlap.printableArea).toEqual(withoutOverlap.printableArea);
    expect(withOverlap.pages.length).toBeGreaterThanOrEqual(
      withoutOverlap.pages.length,
    );
  });

  it("should reject a negative overlap", () => {
    expect(() => a4Layout(templateBounds(800, 1000), -1)).toThrow(
      InvalidOverlapError,
    );
  });

  it("should reject an overlap that is not smaller than the printable area", () => {
    expect(() => a4Layout(templateBounds(800, 1000), 200)).toThrow(
      InvalidOverlapError,
    );
  });
});

describe("Page regions", () => {
  it("should give every page the exact size of the printable area", () => {
    const layout = a4Layout(templateBounds(800, 1000));

    for (const page of layout.pages) {
      expect(boundingBoxDimensions(page.globalBounds)).toEqual(
        layout.printableArea,
      );
    }
  });

  it("should cover the whole template without leaving gaps", () => {
    const bounds = templateBounds(800, 1000);
    const layout = a4Layout(bounds);

    const firstPage = layout.pages[0];
    const lastPage = layout.pages[layout.pages.length - 1];

    expect(firstPage.globalBounds.minX).toBe(bounds.minX);
    expect(firstPage.globalBounds.minY).toBe(bounds.minY);
    expect(lastPage.globalBounds.maxX).toBeGreaterThanOrEqual(bounds.maxX);
    expect(lastPage.globalBounds.maxY).toBeGreaterThanOrEqual(bounds.maxY);

    for (const page of layout.pages) {
      if (page.column === 0) continue;

      const previous = layout.pages[page.pageNumber - 2];
      expect(page.globalBounds.minX).toBeLessThanOrEqual(
        previous.globalBounds.maxX,
      );
    }
  });

  it("should place pages relative to the template origin instead of assuming (0,0)", () => {
    const layout = a4Layout(templateBounds(500, 600, { x: 120, y: 45 }));

    expect(layout.pages[0].globalBounds.minX).toBe(120);
    expect(layout.pages[0].globalBounds.minY).toBe(45);
    expect(layout.pages[1].globalBounds.minX).toBeCloseTo(
      120 + layout.step.width,
      10,
    );
  });

  it("should not scale the template: page origins advance exactly one step", () => {
    const bounds = templateBounds(800, 1000);
    const layout = a4Layout(bounds);

    for (const page of layout.pages) {
      expect(page.globalBounds.minX).toBeCloseTo(
        bounds.minX + page.column * layout.step.width,
        10,
      );
      expect(page.globalBounds.minY).toBeCloseTo(
        bounds.minY + page.row * layout.step.height,
        10,
      );
    }
  });
});
