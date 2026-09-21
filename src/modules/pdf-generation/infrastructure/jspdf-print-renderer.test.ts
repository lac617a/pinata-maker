import { describe, expect, it } from "vitest";

import { createPoint } from "@/modules/geometry/point";
import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";
import {
  PdfResourceLimitError,
  UnsupportedPdfFeatureError,
} from "@/modules/pdf-generation/errors";
import { millimetersToPoints } from "@/modules/pdf-generation/pdf-units";
import type { PrintDocument } from "@/modules/pdf-generation/print-renderer";
import { DEFAULT_CALIBRATION_LENGTH_MM } from "@/modules/printing/calibration";
import { DEFAULT_MARGIN_MM, uniformMargins } from "@/modules/printing/margins";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  createPrintLayout,
  type PrintLayout,
} from "@/modules/printing/print-layout";
import { DEFAULT_OVERLAP_MM } from "@/modules/printing/tiling";

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

/** Pieza pequeña, para documentos de varias secciones. */
const strip = createTemplateGeometry({
  outerContours: [
    createPolygon(
      [
        createPoint(0, 0),
        createPoint(180, 0),
        createPoint(180, 60),
        createPoint(0, 60),
      ],
      true,
    ),
  ],
});

const renderer = new JsPdfPrintRenderer();

/** Fecha fija: el documento no debe depender del momento en que se genera. */
const creationDate = new Date(Date.UTC(2026, 0, 1));

function layoutOn(
  format: PaperFormat,
  orientation: PaperOrientation,
  geometry = template,
): PrintLayout {
  return createPrintLayout(geometry, {
    paper: {
      format,
      orientation,
      margins: uniformMargins(DEFAULT_MARGIN_MM),
    },
    overlap: DEFAULT_OVERLAP_MM,
    calibrationLength: DEFAULT_CALIBRATION_LENGTH_MM,
  });
}

function documentOf(layout: PrintLayout, label = "FRONT"): PrintDocument {
  return { sections: [{ label, layout }] };
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

function printedTexts(bytes: Uint8Array): string[] {
  return [...asText(bytes).matchAll(/\((.*?)\) Tj/g)].map((match) => match[1]);
}

describe("jsPDF print renderer", () => {
  it("should produce a readable PDF document", async () => {
    const document = await renderer.render(
      documentOf(layoutOn("A4", "PORTRAIT")),
      { creationDate },
    );

    expect(asText(document.bytes).startsWith("%PDF-")).toBe(true);
    expect(document.contentType).toBe("application/pdf");
  });

  it("should generate exactly one page per page of the layout", async () => {
    const layout = layoutOn("A4", "PORTRAIT");
    const document = await renderer.render(documentOf(layout), {
      creationDate,
    });

    expect(document.pageCount).toBe(layout.pages.length);
    expect(pageSizes(document.bytes)).toHaveLength(layout.pages.length);
  });

  it("should gather every piece into a single document", async () => {
    // Una piñata se descarga en un archivo, no en uno por pieza (PRD §18).
    const front = layoutOn("A4", "PORTRAIT");
    const side = layoutOn("A4", "PORTRAIT", strip);

    const document = await renderer.render(
      {
        sections: [
          { label: "FRONT", layout: front },
          { label: "SIDE-1", layout: side },
          { label: "SIDE-2", layout: side },
        ],
      },
      { creationDate },
    );

    expect(document.pageCount).toBe(front.pages.length + side.pages.length * 2);
  });

  it("should name the piece each sheet belongs to", async () => {
    // El identificador de retícula A1 se repite en todas las piezas.
    const document = await renderer.render(
      {
        sections: [
          { label: "SIDE-1", layout: layoutOn("A4", "PORTRAIT", strip) },
          { label: "SIDE-2", layout: layoutOn("A4", "PORTRAIT", strip) },
        ],
      },
      { creationDate },
    );

    const texts = printedTexts(document.bytes);

    expect(texts.some((text) => text.includes("SIDE-1"))).toBe(true);
    expect(texts.some((text) => text.includes("SIDE-2"))).toBe(true);
  });

  it("should open the document with an instruction sheet", async () => {
    const side = layoutOn("A4", "PORTRAIT", strip);

    const document = await renderer.render(
      {
        cover: {
          title: "Elefante",
          width: 800,
          height: 1000,
          depth: 200,
          paper: "A4 vertical",
          scale: 1,
        },
        sections: [
          { label: "SIDE-1", layout: side },
          { label: "SIDE-2", layout: side },
        ],
      },
      { creationDate },
    );

    const texts = printedTexts(document.bytes);

    expect(document.pageCount).toBe(side.pages.length * 2 + 1);
    expect(texts).toContain("Elefante");
    expect(texts.some((text) => text.includes("800"))).toBe(true);
    expect(texts.some((text) => text.includes("Escala: 100 %"))).toBe(true);
    // El inventario dice cuántas hojas ocupa cada pieza.
    expect(texts.some((text) => text.startsWith("SIDE-1 "))).toBe(true);
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
      {
        format: "LETTER",
        orientation: "PORTRAIT",
        width: 215.9,
        height: 279.4,
      },
    ];

    for (const expected of cases) {
      const document = await renderer.render(
        documentOf(layoutOn(expected.format, expected.orientation)),
        { creationDate },
      );

      for (const size of pageSizes(document.bytes)) {
        expect(size.width).toBeCloseTo(millimetersToPoints(expected.width), 1);
        expect(size.height).toBeCloseTo(
          millimetersToPoints(expected.height),
          1,
        );
      }
    }
  });

  it("should keep a landscape sheet wider than it is tall", async () => {
    const document = await renderer.render(
      documentOf(layoutOn("A4", "LANDSCAPE")),
      { creationDate },
    );

    for (const size of pageSizes(document.bytes)) {
      expect(size.width).toBeGreaterThan(size.height);
    }
  });

  it("should produce the same document for the same layout", async () => {
    const document = documentOf(layoutOn("A4", "PORTRAIT"));

    const first = await renderer.render(document, { creationDate });
    const second = await renderer.render(document, { creationDate });

    // El identificador de archivo es aleatorio por diseño de la librería; el
    // resto del documento debe ser idéntico. Ver docs/pdf.md §72.
    const withoutFileId = (bytes: Uint8Array) =>
      asText(bytes).replace(/\/ID \[[^\]]*\]/, "");

    expect(withoutFileId(first.bytes)).toBe(withoutFileId(second.bytes));
  });

  it("should name the file safely", async () => {
    const document = await renderer.render(
      documentOf(layoutOn("A4", "PORTRAIT")),
      { creationDate, fileName: "../../etc/piñata fiesta.pdf" },
    );

    expect(document.fileName).toBe("etc-piñata-fiesta.pdf");
  });

  it("should refuse a section that asks for a scale it cannot apply", async () => {
    const layout = { ...layoutOn("A4", "PORTRAIT"), scale: 0.5 };

    await expect(renderer.render(documentOf(layout))).rejects.toThrow(
      UnsupportedPdfFeatureError,
    );
  });

  it("should refuse a document with more pages than it supports", async () => {
    const layout = layoutOn("A4", "PORTRAIT");
    const oversized = {
      ...layout,
      pages: Array.from({ length: 501 }, () => layout.pages[0]),
    };

    await expect(renderer.render(documentOf(oversized))).rejects.toThrow(
      PdfResourceLimitError,
    );
  });
});
