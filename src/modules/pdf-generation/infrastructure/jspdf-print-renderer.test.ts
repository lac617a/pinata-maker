import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { createPoint } from "@/modules/geometry/point";
import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";
import {
  PdfResourceLimitError,
  UnsupportedPdfFeatureError,
} from "@/modules/pdf-generation/errors";
import { millimetersToPoints } from "@/modules/pdf-generation/pdf-units";
import {
  MAX_EMBEDDED_IMAGE_BYTES,
  type PrintDocument,
} from "@/modules/pdf-generation/print-renderer";
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

/**
 * PNG opaco de 4 × 4 construido a mano.
 *
 * Opaco a propósito: sin canal alfa, jsPDF lo incrusta como un único objeto
 * de imagen y se puede contar sin ambigüedad.
 */
function opaquePng(): Uint8Array {
  const table = Array.from({ length: 256 }, (_unused, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (data: Buffer) => {
    let c = 0xffffffff;
    for (const byte of data) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const check = Buffer.alloc(4);
    check.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, check]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(4, 0);
  header.writeUInt32BE(4, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 2; // RGB, sin alfa

  const rows = Buffer.alloc(4 * (1 + 4 * 3), 200);
  for (let row = 0; row < 4; row++) rows[row * 13] = 0;

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(rows)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

describe("jsPDF print renderer with artwork", () => {
  const layout = layoutOn("A4", "PORTRAIT");

  const withArtwork = (mirrored: boolean): PrintDocument => ({
    sections: [
      {
        label: mirrored ? "BACK" : "FRONT",
        layout,
        artwork: {
          image: { bytes: opaquePng(), format: "PNG" },
          placement: { x: -20, y: -20, width: 840, height: 1040 },
          mirrored,
          clip: template.outerContours,
        },
      },
    ],
  });

  it("should embed the image once for every sheet it appears on", async () => {
    const document = await renderer.render(withArtwork(false), {
      creationDate,
    });

    const text = asText(document.bytes);

    // La figura cae en todas las hojas de la pieza. Incrustada en cada una,
    // el documento pesaría la imagen multiplicada por el número de hojas.
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(1);
    expect(text.match(/\/I\d+ Do/g)).toHaveLength(layout.pages.length);
  });

  it("should clip the image before drawing it", async () => {
    const document = await renderer.render(withArtwork(false), {
      creationDate,
    });

    // `W n`: el trazado recorta y no se pinta. Sin recorte la imagen entera
    // saldría en cada hoja, fuera de la silueta.
    expect(asText(document.bytes)).toMatch(/W\s+n[\s\S]*?\/I\d+ Do/);
  });

  it("should flip the image of the back piece", async () => {
    const front = asText(
      (await renderer.render(withArtwork(false), { creationDate })).bytes,
    );
    const back = asText(
      (await renderer.render(withArtwork(true), { creationDate })).bytes,
    );

    expect(front).not.toMatch(/-1\. 0\. 0\. 1\. [\d.]+ 0\. cm/);
    expect(back).toMatch(/-1\. 0\. 0\. 1\. [\d.]+ 0\. cm/);
  });

  it("should keep the page count when a piece carries artwork", async () => {
    const document = await renderer.render(withArtwork(false), {
      creationDate,
    });

    expect(document.pageCount).toBe(layout.pages.length);
  });

  it("should refuse an image above the size limit", async () => {
    const huge: PrintDocument = {
      sections: [
        {
          label: "FRONT",
          layout,
          artwork: {
            image: {
              bytes: new Uint8Array(MAX_EMBEDDED_IMAGE_BYTES + 1),
              format: "PNG",
            },
            placement: { x: 0, y: 0, width: 800, height: 1000 },
            mirrored: false,
            clip: template.outerContours,
          },
        },
      ],
    };

    await expect(renderer.render(huge)).rejects.toBeInstanceOf(
      PdfResourceLimitError,
    );
  });
});
