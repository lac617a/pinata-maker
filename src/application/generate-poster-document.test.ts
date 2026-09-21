import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { JsPdfPrintRenderer } from "@/modules/pdf-generation/infrastructure/jspdf-print-renderer";
import type {
  PrintDocument,
  PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import { createPoster, posterLayout } from "@/modules/posters/poster";
import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";

import { generatePosterDocument } from "./generate-poster-document";

/** PNG opaco de 4 × 4: lo mínimo que jsPDF acepta incrustar. */
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
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc(4 * 13, 200);
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

const imageSize = { width: 720, height: 894 };
const poster = createPoster(imageSize, { width: 600 });
const image = { bytes: opaquePng(), format: "PNG" as const };

function capturing() {
  const documents: PrintDocument[] = [];
  const renderer: PrintRenderer = {
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

  return { documents, renderer };
}

describe("Generate poster document", () => {
  it("should print the whole image across the sheets", async () => {
    const { documents, renderer } = capturing();

    await generatePosterDocument({
      poster,
      image,
      imageSize,
      title: "4",
      renderer,
    });

    const [section] = documents[0].sections;

    // La imagen ocupa el póster entero: nada recortado, nada deformado.
    expect(section.kind).toBe("POSTER");
    expect(section.artwork?.placement).toMatchObject({
      x: expect.closeTo(0, 6),
      y: expect.closeTo(0, 6),
      width: poster.width,
      height: expect.closeTo(poster.height, 6),
    });
  });

  it("should print only the cropped part, enlarged to the poster", async () => {
    const { documents, renderer } = capturing();
    const crop = { x: 180, y: 0, width: 360, height: 447 };
    const cropped = createPoster(crop, { width: 600 });

    await generatePosterDocument({
      poster: cropped,
      image,
      imageSize,
      crop,
      title: "4",
      renderer,
    });

    const [section] = documents[0].sections;
    const cover = documents[0].cover;

    // Medio ancho de imagen en 60 cm: la imagen entera mediría 120 cm y
    // empezaría 30 cm a la izquierda del póster, fuera del papel.
    expect(section.artwork?.placement.x).toBeCloseTo(-300, 6);
    expect(section.artwork?.placement.width).toBeCloseTo(1200, 6);
    // El recorte sigue siendo el borde del póster, no el de la imagen.
    expect(section.artwork?.clip[0].points[2]).toEqual({
      x: cropped.width,
      y: cropped.height,
    });
    // El mapa del resumen enseña lo mismo que las hojas.
    expect(cover && "placement" in cover ? cover.placement : null).toEqual(
      section.artwork?.placement,
    );
  });

  it("should lay out the same sheets the preview shows", async () => {
    const { documents, renderer } = capturing();

    await generatePosterDocument({
      poster,
      image,
      imageSize,
      title: "4",
      renderer,
    });

    expect(documents[0].sections[0].layout.pages.length).toBe(
      posterLayout(poster, DEFAULT_PRINT_CONFIGURATION).pages.length,
    );
  });

  it("should open with a summary sheet", async () => {
    const { documents, renderer } = capturing();

    await generatePosterDocument({
      poster,
      image,
      imageSize,
      title: "4",
      renderer,
    });

    expect(documents[0].cover).toMatchObject({
      kind: "POSTER",
      title: "4",
      paper: "A4 vertical",
    });
  });

  it("should produce a real PDF with one page per sheet plus the summary", async () => {
    const document = await generatePosterDocument({
      poster,
      image,
      imageSize,
      title: "4",
      renderer: new JsPdfPrintRenderer(),
    });

    const sheets = posterLayout(poster, DEFAULT_PRINT_CONFIGURATION).pages
      .length;
    const text = Buffer.from(document.bytes).toString("latin1");

    expect(document.pageCount).toBe(sheets + 1);
    // Una sola copia de la imagen para el mapa y todas las hojas.
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(1);
  });

  it("should put the scale ruler on the summary, not over the figure", async () => {
    const document = await generatePosterDocument({
      poster,
      image,
      imageSize,
      title: "4",
      renderer: new JsPdfPrintRenderer(),
    });

    const text = Buffer.from(document.bytes).toString("latin1");

    // La etiqueta de la regla aparece una vez: en el resumen.
    expect(text.match(/\(100 mm\) Tj/g)).toHaveLength(1);
  });
});
