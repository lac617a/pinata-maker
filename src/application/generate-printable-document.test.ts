import { describe, expect, it } from "vitest";

import { createDimensions } from "@/modules/geometry/dimensions";
import { createAlphaMask } from "@/modules/image-processing/mask";
import { JsPdfPrintRenderer } from "@/modules/pdf-generation/infrastructure/jspdf-print-renderer";
import type {
  PrintDocument,
  PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";

import {
  countPrintableSheets,
  generatePrintableDocument,
} from "./generate-printable-document";
import { generateTemplate } from "./generate-template";

const WIDTH = 300;
const HEIGHT = 400;

const alpha = new Uint8Array(WIDTH * HEIGHT);

for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    alpha[y * WIDTH + x] =
      Math.hypot((x - 150) / 120, (y - 200) / 170) <= 1 ? 255 : 0;
  }
}

const { template } = generateTemplate({
  mask: createAlphaMask(WIDTH, HEIGHT, alpha),
  dimensions: createDimensions(300, 400),
  depth: 80,
  name: "Elefante",
});

const renderer = new JsPdfPrintRenderer();
const creationDate = new Date(Date.UTC(2026, 0, 1));

function asText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

describe("Generate printable document", () => {
  it("should gather the whole piñata into one file", async () => {
    const document = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
    });

    expect(document.contentType).toBe("application/pdf");
    expect(asText(document.bytes).startsWith("%PDF-")).toBe(true);
    expect(document.pageCount).toBe(countPrintableSheets(template));
  });

  it("should count the sheets without generating the document", async () => {
    const predicted = countPrintableSheets(template);
    const document = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
    });

    expect(predicted).toBe(document.pageCount);
  });

  it("should include one sheet more than the pieces need, for the instructions", () => {
    const sheets = countPrintableSheets(template);

    expect(sheets).toBeGreaterThan(template.pieces.length);
  });

  it("should name the file after the figure", async () => {
    const document = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
    });

    expect(document.fileName).toBe("Elefante.pdf");
  });

  it("should keep a name that could escape its directory harmless", async () => {
    const document = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
      fileName: "../../../etc/passwd",
    });

    expect(document.fileName).toBe("etc-passwd.pdf");
  });

  it("should produce the same document for the same template", async () => {
    const withoutFileId = (bytes: Uint8Array) =>
      asText(bytes).replace(/\/ID \[[^\]]*\]/, "");

    const first = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
    });
    const second = await generatePrintableDocument({
      template,
      renderer,
      creationDate,
    });

    expect(withoutFileId(first.bytes)).toBe(withoutFileId(second.bytes));
  });
});

describe("Generate printable document with the source image", () => {
  /** Guarda lo que se le pide dibujar: aquí importa el documento, no el PDF. */
  function capturing() {
    const documents: PrintDocument[] = [];

    const capture: PrintRenderer = {
      render: async (document) => {
        documents.push(document);

        return {
          fileName: "x.pdf",
          contentType: "application/pdf",
          pageCount: 1,
          bytes: new Uint8Array([1]),
        };
      },
    };

    return { documents, capture };
  }

  const image = { bytes: new Uint8Array([1, 2, 3]), format: "PNG" as const };

  it("should draw the image on the front and the back", async () => {
    const { documents, capture } = capturing();

    await generatePrintableDocument({
      template,
      renderer: capture,
      referenceImage: image,
    });

    const byLabel = new Map(
      documents[0].sections.map((section) => [section.label, section]),
    );

    expect(byLabel.get("FRONT")?.artwork?.mirrored).toBe(false);
    // La espalda se recorta volteada, así que la figura también.
    expect(byLabel.get("BACK")?.artwork?.mirrored).toBe(true);
  });

  it("should not draw the image on the side strip", async () => {
    const { documents, capture } = capturing();

    await generatePrintableDocument({
      template,
      renderer: capture,
      referenceImage: image,
    });

    const sides = documents[0].sections.filter((section) =>
      section.label.startsWith("SIDE"),
    );

    expect(sides.length).toBeGreaterThan(0);
    expect(sides.every((section) => section.artwork === undefined)).toBe(true);
  });

  it("should clip the image with the silhouette of its own piece", async () => {
    const { documents, capture } = capturing();

    await generatePrintableDocument({
      template,
      renderer: capture,
      referenceImage: image,
    });

    const front = documents[0].sections.find(
      (section) => section.label === "FRONT",
    );
    const frontPiece = template.pieces.find((piece) => piece.role === "FRONT");

    expect(front?.artwork?.clip).toEqual(frontPiece?.geometry.outerContours);
  });

  it("should print only the contours when there is no image", async () => {
    const { documents, capture } = capturing();

    await generatePrintableDocument({ template, renderer: capture });

    expect(
      documents[0].sections.every((section) => section.artwork === undefined),
    ).toBe(true);
  });
});
