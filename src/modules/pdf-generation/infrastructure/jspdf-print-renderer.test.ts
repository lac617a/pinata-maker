import { describe, expect, it } from "vitest";

import { createPoint } from "../../geometry/point";
import { createPolygon } from "../../geometry/polygon";
import { createTemplateGeometry } from "../../geometry/template-geometry";
import { DEFAULT_CALIBRATION_LENGTH_MM } from "../../printing/calibration";
import { DEFAULT_MARGIN_MM, uniformMargins } from "../../printing/margins";
import type {
  PaperFormat,
  PaperOrientation,
} from "../../printing/paper-format";
import {
  createPrintLayout,
  type PrintLayout,
} from "../../printing/print-layout";
import { DEFAULT_OVERLAP_MM } from "../../printing/tiling";
import { PdfResourceLimitError, UnsupportedPdfFeatureError } from "../errors";
import { millimetersToPoints } from "../pdf-units";
import { JsPdfPrintRenderer } from "./jspdf-print-renderer";

/** Silueta rectangular de 800 × 1000 mm, el caso de referencia del PRD. */
const template = createTemplateGeometry({
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

const renderer = new JsPdfPrintRenderer();

/** Fecha fija: el documento no debe depender del momento en que se genera. */
const creationDate = new Date(Date.UTC(2026, 0, 1));

function layoutOn(
  format: PaperFormat,
  orientation: PaperOrientation,
): PrintLayout {
  return createPrintLayout(template, {
    paper: {
      format,
      orientation,
      margins: uniformMargins(DEFAULT_MARGIN_MM),
    },
    overlap: DEFAULT_OVERLAP_MM,
    calibrationLength: DEFAULT_CALIBRATION_LENGTH_MM,
  });
}

function asText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

/** Tamaño real de cada hoja del documento, leído del PDF generado. */
function pageSizes(bytes: Uint8Array): { width: number; height: number }[] {
  const boxes = asText(bytes).matchAll(
    /\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/g,
  );

  return [...boxes].map((box) => ({
    width: Number(box[3]) - Number(box[1]),
    height: Number(box[4]) - Number(box[2]),
  }));
}

describe("jsPDF print renderer", () => {
  it("should produce a readable PDF document", async () => {
    const document = await renderer.render(layoutOn("A4", "PORTRAIT"), {
      creationDate,
    });

    expect(asText(document.bytes).startsWith("%PDF-")).toBe(true);
    expect(document.contentType).toBe("application/pdf");
  });

  it("should generate exactly one page per page of the layout", async () => {
    const layout = layoutOn("A4", "PORTRAIT");
    const document = await renderer.render(layout, { creationDate });

    expect(document.pageCount).toBe(layout.pages.length);
    expect(pageSizes(document.bytes)).toHaveLength(layout.pages.length);
  });

  it("should size every sheet as the paper of the layout", async () => {
    const cases: {
      format: PaperFormat;
      orientation: PaperOrientation;
      width: number;
      height: number;
    }[] = [
      { format: "A4", orientation: "PORTRAIT", width: 210, height: 297 },
      { format: "A4", orientation: "LANDSCAPE", width: 297, height: 210 },
      { format: "A3", orientation: "PORTRAIT", width: 297, height: 420 },
      { format: "LETTER", orientation: "PORTRAIT", width: 215.9, height: 279.4 },
    ];

    for (const expected of cases) {
      const document = await renderer.render(
        layoutOn(expected.format, expected.orientation),
        { creationDate },
      );

      for (const size of pageSizes(document.bytes)) {
        expect(size.width).toBeCloseTo(millimetersToPoints(expected.width), 1);
        expect(size.height).toBeCloseTo(millimetersToPoints(expected.height), 1);
      }
    }
  });

  it("should keep a landscape sheet wider than it is tall", async () => {
    const document = await renderer.render(layoutOn("A4", "LANDSCAPE"), {
      creationDate,
    });

    for (const size of pageSizes(document.bytes)) {
      expect(size.width).toBeGreaterThan(size.height);
    }
  });

  it("should produce the same document for the same layout", async () => {
    const layout = layoutOn("A4", "PORTRAIT");

    const first = await renderer.render(layout, { creationDate });
    const second = await renderer.render(layout, { creationDate });

    // El identificador de archivo es aleatorio por diseño de la librería; el
    // resto del documento debe ser idéntico. Ver docs/pdf.md §72.
    const withoutFileId = (bytes: Uint8Array) =>
      asText(bytes).replace(/\/ID \[[^\]]*\]/, "");

    expect(withoutFileId(first.bytes)).toBe(withoutFileId(second.bytes));
  });

  it("should name the file safely", async () => {
    const document = await renderer.render(layoutOn("A4", "PORTRAIT"), {
      creationDate,
      fileName: "../../etc/piñata fiesta.pdf",
    });

    expect(document.fileName).toBe("etc-piñata-fiesta.pdf");
  });

  it("should refuse a layout that asks for a scale it cannot apply", async () => {
    const layout = { ...layoutOn("A4", "PORTRAIT"), scale: 0.5 };

    await expect(renderer.render(layout)).rejects.toThrow(
      UnsupportedPdfFeatureError,
    );
  });

  it("should refuse a document with more pages than it supports", async () => {
    const layout = layoutOn("A4", "PORTRAIT");
    const oversized = {
      ...layout,
      pages: Array.from({ length: 501 }, () => layout.pages[0]),
    };

    await expect(renderer.render(oversized)).rejects.toThrow(
      PdfResourceLimitError,
    );
  });
});
