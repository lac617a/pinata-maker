import { describe, expect, it } from "vitest";

import { createPoint } from "../geometry/point";
import { createPolygon } from "../geometry/polygon";
import {
  createTemplateGeometry,
  isTemplateGeometryEmpty,
} from "../geometry/template-geometry";
import { createPrintLayout, PRINT_SCALE_ACTUAL_SIZE } from "./print-layout";

/** Silueta rectangular de 800 × 1000 mm, el caso de referencia del PRD. */
const largeTemplate = createTemplateGeometry({
  outerContours: [
    createPolygon(
      [
        createPoint(0, 0),
        createPoint(800, 0),
        createPoint(800, 1000),
        createPoint(0, 1000),
      ],
      true,
    ),
  ],
});

const smallTemplate = createTemplateGeometry({
  outerContours: [
    createPolygon(
      [createPoint(0, 0), createPoint(100, 0), createPoint(100, 80)],
      true,
    ),
  ],
});

describe("Print layout", () => {
  it("should keep the physical size of the template after splitting it", () => {
    const layout = createPrintLayout(largeTemplate);

    expect(layout.totalWidth).toBe(800);
    expect(layout.totalHeight).toBe(1000);
  });

  it("should print at actual size", () => {
    expect(createPrintLayout(largeTemplate).scale).toBe(
      PRINT_SCALE_ACTUAL_SIZE,
    );
  });

  it("should spread the template over the sheets it needs", () => {
    const layout = createPrintLayout(largeTemplate);

    expect(layout.rows).toBe(4);
    expect(layout.columns).toBe(5);
    expect(layout.pages).toHaveLength(20);
  });

  it("should tell every page its number within the document", () => {
    const layout = createPrintLayout(largeTemplate);

    expect(layout.pages[0].id).toBe("A1");
    expect(layout.pages[0].pageNumber).toBe(1);
    expect(layout.pages[19].id).toBe("D5");
    expect(
      layout.pages.every((page) => page.totalPages === 20),
    ).toBe(true);
  });

  it("should give each page the part of the template it must print", () => {
    const layout = createPrintLayout(largeTemplate);
    const firstPage = layout.pages[0];

    expect(isTemplateGeometryEmpty(firstPage.geometry)).toBe(false);

    // La hoja contiene el tramo del contorno que sube por el borde izquierdo y
    // gira por el superior, en coordenadas locales y sin cerrar por el papel.
    expect(firstPage.geometry.outerContours).toHaveLength(1);
    expect(firstPage.geometry.outerContours[0].points).toEqual([
      { x: 0, y: 287 },
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
  });

  it("should move the calibration mark away from the template outline", () => {
    const layout = createPrintLayout(largeTemplate);

    // El contorno recorre el borde izquierdo de la primera hoja, así que la
    // regla no cabe en esa esquina.
    expect(layout.pages[0].calibrationMark?.position.x).toBe(100);
    expect(layout.pages[0].calibrationMark?.length).toBe(100);
  });

  it("should connect adjacent pages with alignment marks", () => {
    const layout = createPrintLayout(largeTemplate);
    const firstPage = layout.pages[0];

    expect(firstPage.alignmentMarks).toHaveLength(4);
    expect(
      firstPage.alignmentMarks.map((mark) => mark.connectsTo),
    ).toEqual(["A2", "A2", "B1", "B1"]);
  });

  it("should not add alignment marks to a single-page document", () => {
    const layout = createPrintLayout(smallTemplate);

    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0].alignmentMarks).toEqual([]);
    expect(layout.pages[0].calibrationMark).toBeDefined();
  });

  it("should produce the same document for the same template", () => {
    expect(createPrintLayout(largeTemplate)).toEqual(
      createPrintLayout(largeTemplate),
    );
  });
});
