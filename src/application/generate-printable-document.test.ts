import { describe, expect, it } from "vitest";

import { createDimensions } from "../modules/geometry/dimensions";
import { JsPdfPrintRenderer } from "../modules/pdf-generation/infrastructure/jspdf-print-renderer";
import { createAlphaMask } from "../modules/image-processing/mask";
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
