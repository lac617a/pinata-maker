import { describe, expect, it } from "vitest";

import { createPoint } from "@/modules/geometry/point";
import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";
import { DEFAULT_MARGIN_MM } from "@/modules/printing/margins";
import {
  createPrintLayout,
  type PrintPage,
} from "@/modules/printing/print-layout";

import {
  ALIGNMENT_ARM_MM,
  describePage,
  type PageStroke,
  PRINT_SCALE_WARNING,
} from "./page-drawing";

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
  foldLines: [
    {
      geometry: createPolygon(
        [createPoint(0, 500), createPoint(800, 500)],
        false,
      ),
    },
  ],
});

const layout = createPrintLayout(largeTemplate);

function strokesOf(page: PrintPage, role: PageStroke["role"]): PageStroke[] {
  return describePage(page).strokes.filter((stroke) => stroke.role === role);
}

describe("Page drawing", () => {
  it("should offset the template by the margins of the sheet", () => {
    const page = layout.pages[0];
    const [contour] = strokesOf(page, "CONTOUR");
    const [original] = page.geometry.outerContours;

    expect(contour.path.points[0]).toEqual({
      x: original.points[0].x + DEFAULT_MARGIN_MM,
      y: original.points[0].y + DEFAULT_MARGIN_MM,
    });
  });

  it("should not resize the template while placing it on the sheet", () => {
    const page = layout.pages[0];
    const [contour] = strokesOf(page, "CONTOUR");
    const [original] = page.geometry.outerContours;

    const width = (points: { x: number }[]) =>
      Math.max(...points.map((point) => point.x)) -
      Math.min(...points.map((point) => point.x));

    expect(width([...contour.path.points])).toBe(width([...original.points]));
  });

  it("should keep cut lines and fold lines apart", () => {
    const foldPage = layout.pages.find(
      (page) => page.geometry.foldLines.length > 0,
    );

    expect(foldPage).toBeDefined();
    expect(strokesOf(foldPage!, "FOLD")).toHaveLength(1);
    expect(strokesOf(foldPage!, "CUT")).toHaveLength(0);
  });

  it("should draw an open outline for a template cut by the edge of the sheet", () => {
    const page = layout.pages[0];
    const [contour] = strokesOf(page, "CONTOUR");

    // Cerrar el trazo inventaría una línea de corte por el canto de la hoja.
    expect(contour.path.closed).toBe(false);
  });

  it("should draw a cross centred on every alignment mark", () => {
    const page = layout.pages[0];
    const marks = page.alignmentMarks;
    const crosses = strokesOf(page, "ALIGNMENT");

    expect(marks.length).toBeGreaterThan(0);
    expect(crosses).toHaveLength(marks.length * 2);

    const [horizontal, vertical] = crosses;
    const expected = {
      x: marks[0].position.x + page.printableOrigin.x,
      y: marks[0].position.y + page.printableOrigin.y,
    };

    expect(horizontal.path.points).toEqual([
      { x: expected.x - ALIGNMENT_ARM_MM, y: expected.y },
      { x: expected.x + ALIGNMENT_ARM_MM, y: expected.y },
    ]);
    expect(vertical.path.points).toEqual([
      { x: expected.x, y: expected.y - ALIGNMENT_ARM_MM },
      { x: expected.x, y: expected.y + ALIGNMENT_ARM_MM },
    ]);
  });

  it("should name the neighbouring sheet next to every alignment mark", () => {
    const page = layout.pages[0];
    const labels = describePage(page).texts.filter(
      (text) => text.role === "ALIGNMENT_LABEL",
    );

    expect(labels.map((label) => label.text)).toEqual(
      page.alignmentMarks.map((mark) => mark.connectsTo),
    );
  });

  it("should draw a ruler of exactly the declared length", () => {
    const page = layout.pages.find((candidate) => candidate.calibrationMark);

    expect(page).toBeDefined();

    const [ruler] = strokesOf(page!, "CALIBRATION");
    const [start, end] = ruler.path.points;

    expect(end.x - start.x).toBe(page!.calibrationMark!.length);
    expect(end.y).toBe(start.y);
  });

  it("should state the length of the ruler next to it", () => {
    const page = layout.pages.find((candidate) => candidate.calibrationMark);
    const label = describePage(page!).texts.find(
      (text) => text.role === "CALIBRATION_LABEL",
    );

    expect(label?.text).toBe("100 mm");
  });

  it("should not draw a ruler on a sheet that has no room for it", () => {
    // Líneas de doblez que cruzan las cuatro esquinas del área imprimible.
    const crowded = createTemplateGeometry({
      foldLines: [
        {
          geometry: createPolygon(
            [createPoint(0, 4), createPoint(200, 4)],
            false,
          ),
        },
        {
          geometry: createPolygon(
            [createPoint(0, 283), createPoint(200, 283)],
            false,
          ),
        },
      ],
    });

    const [page] = createPrintLayout(crowded).pages;

    expect(page.calibrationMark).toBeUndefined();
    expect(strokesOf(page, "CALIBRATION")).toHaveLength(0);
    expect(
      describePage(page).texts.some(
        (text) => text.role === "CALIBRATION_LABEL",
      ),
    ).toBe(false);
  });

  it("should identify every sheet and warn about the print scale", () => {
    for (const page of layout.pages) {
      const texts = describePage(page).texts;

      expect(texts.find((text) => text.role === "PAGE_LABEL")?.text).toBe(
        `${page.id} (${page.pageNumber} / ${page.totalPages})`,
      );
      expect(texts.find((text) => text.role === "PRINT_WARNING")?.text).toBe(
        PRINT_SCALE_WARNING,
      );
    }
  });

  it("should keep the footer inside the printable area", () => {
    const page = layout.pages[0];
    const footer = describePage(page).texts.find(
      (text) => text.role === "PAGE_LABEL",
    );

    expect(footer!.position.y).toBeLessThan(
      page.printableOrigin.y + page.printableArea.height,
    );
    expect(footer!.position.x).toBeGreaterThanOrEqual(page.printableOrigin.x);
  });

  it("should describe the same sheet in the same way every time", () => {
    expect(describePage(layout.pages[7])).toEqual(
      describePage(layout.pages[7]),
    );
  });
});

describe("Artwork on each sheet", () => {
  const artwork = {
    image: { bytes: new Uint8Array([1, 2, 3]), format: "PNG" as const },
    // La imagen asoma 20 mm por cada lado de la silueta de 800 × 1000.
    placement: { x: -20, y: -20, width: 840, height: 1040 },
    mirrored: false,
    clip: largeTemplate.outerContours,
  };

  it("should move the image to paper coordinates like the geometry", () => {
    const page = layout.pages[layout.pages.length - 1];
    const [image] = describePage(page, "FRONT", artwork).images;

    // Global → papel: restar la región de la hoja y sumar el origen del área
    // imprimible, la misma traslación que ya sufrió el contorno.
    expect(image.x).toBeCloseTo(
      -20 - page.globalBounds.minX + page.printableOrigin.x,
      6,
    );
    expect(image.y).toBeCloseTo(
      -20 - page.globalBounds.minY + page.printableOrigin.y,
      6,
    );
    expect(image.width).toBe(840);
  });

  it("should clip the image with the silhouette in the same coordinates", () => {
    const page = layout.pages[1];
    const [image] = describePage(page, "FRONT", artwork).images;
    const [contour] = strokesOf(page, "CONTOUR");

    // El recorte y el trazo tienen que coincidir: si no, la figura se sale
    // de la línea por la que se corta.
    const first = image.clip[0].points[0];

    expect(first.x).toBeCloseTo(
      0 - page.globalBounds.minX + page.printableOrigin.x,
      6,
    );
    expect(contour).toBeDefined();
  });

  it("should keep the image inside the printable area", () => {
    const page = layout.pages[0];
    const [image] = describePage(page, "FRONT", artwork).images;

    expect(image.bounds).toEqual({
      x: page.printableOrigin.x,
      y: page.printableOrigin.y,
      width: page.printableArea.width,
      height: page.printableArea.height,
    });
  });

  it("should put the image on every sheet the piece covers", () => {
    const withImage = layout.pages.filter(
      (page) => describePage(page, "FRONT", artwork).images.length === 1,
    );

    expect(withImage).toHaveLength(layout.pages.length);
  });

  it("should leave out a sheet the image does not reach", () => {
    const small = {
      ...artwork,
      placement: { x: 0, y: 0, width: 50, height: 50 },
    };

    const withImage = layout.pages.filter(
      (page) => describePage(page, "FRONT", small).images.length === 1,
    );

    // Incrustarla donde no se ve solo haría el documento más pesado.
    expect(withImage).toHaveLength(1);
  });

  it("should carry the mirroring to every sheet", () => {
    const back = { ...artwork, mirrored: true };

    expect(
      layout.pages.every(
        (page) => describePage(page, "BACK", back).images[0]?.mirrored,
      ),
    ).toBe(true);
  });

  it("should draw no image when the piece has none", () => {
    expect(describePage(layout.pages[0], "SIDE-1").images).toEqual([]);
  });
});
