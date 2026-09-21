import { describe, expect, it } from "vitest";

import { createDimensions } from "@/modules/geometry/dimensions";
import { AmbiguousSubjectError } from "@/modules/image-processing/errors";
import {
  type AlphaMask,
  createAlphaMask,
} from "@/modules/image-processing/mask";
import { uniformMargins } from "@/modules/printing/margins";
import { createPrintLayout } from "@/modules/printing/print-layout";
import { UnsupportedSilhouetteError } from "@/modules/templates/errors";
import { templatePiecesWithRole } from "@/modules/templates/template";

import { generateTemplate } from "./generate-template";

const WIDTH = 400;
const HEIGHT = 500;

/** Dibuja una figura en el canal alfa, como la dejaría una segmentación. */
function maskOf(inside: (x: number, y: number) => boolean): AlphaMask {
  const alpha = new Uint8Array(WIDTH * HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      alpha[y * WIDTH + x] = inside(x, y) ? 255 : 0;
    }
  }

  return createAlphaMask(WIDTH, HEIGHT, alpha);
}

const ellipse = maskOf(
  (x, y) => Math.hypot((x - 200) / 150, (y - 250) / 200) <= 1,
);

const dimensions = createDimensions(800, 1000);

describe("Generate template", () => {
  it("should place the source image around the silhouette", () => {
    // La elipse deja margen transparente alrededor, así que la imagen empieza
    // antes que la silueta —en negativo— y termina después.
    const { imagePlacement, template } = generateTemplate({
      mask: ellipse,
      dimensions,
      depth: 200,
    });

    expect(imagePlacement.x).toBeLessThan(0);
    expect(imagePlacement.y).toBeLessThan(0);
    expect(imagePlacement.x + imagePlacement.width).toBeGreaterThan(
      template.width,
    );
    expect(imagePlacement.y + imagePlacement.height).toBeGreaterThan(
      template.height,
    );
  });

  it("should scale the image evenly in both directions", () => {
    const { imagePlacement } = generateTemplate({
      mask: ellipse,
      dimensions,
      depth: 200,
    });

    // La silueta se escala sin deformar; si la imagen no, la figura dibujada
    // dejaría de caer dentro del contorno que se recorta.
    expect(imagePlacement.width / WIDTH).toBeCloseTo(
      imagePlacement.height / HEIGHT,
      6,
    );
  });

  it("should turn a mask into a template with pieces", () => {
    const result = generateTemplate({ mask: ellipse, dimensions, depth: 200 });

    expect(templatePiecesWithRole(result.template, "FRONT")).toHaveLength(1);
    expect(templatePiecesWithRole(result.template, "BACK")).toHaveLength(1);
    expect(
      templatePiecesWithRole(result.template, "SIDE").length,
    ).toBeGreaterThan(1);
    expect(result.template.depth).toBe(200);
  });

  it("should size the side pieces for the paper they will be printed on", () => {
    // Ningún módulo del dominio conoce el papel: es lo único que aporta el
    // caso de uso. Ver template.md §118.
    const result = generateTemplate({ mask: ellipse, dimensions, depth: 200 });

    for (const side of templatePiecesWithRole(result.template, "SIDE")) {
      expect(createPrintLayout(side.geometry).columns).toBe(1);
    }
  });

  it("should adapt the side pieces to a wider sheet", () => {
    const onA3 = generateTemplate({
      mask: ellipse,
      dimensions,
      depth: 200,
      paper: {
        format: "A3",
        orientation: "PORTRAIT",
        margins: uniformMargins(5),
      },
    });

    const onA4 = generateTemplate({ mask: ellipse, dimensions, depth: 200 });

    // Un A3 cabe más tira por hoja, así que hacen falta menos piezas.
    expect(templatePiecesWithRole(onA3.template, "SIDE").length).toBeLessThan(
      templatePiecesWithRole(onA4.template, "SIDE").length,
    );
  });

  it("should report what the template will cost in paper", () => {
    const result = generateTemplate({ mask: ellipse, dimensions, depth: 200 });

    expect(result.footprint.pieceCount).toBe(result.template.pieces.length);
    expect(result.footprint.totalArea).toBeGreaterThan(0);
  });

  it("should warn when the requested size cannot be met without distortion", () => {
    const result = generateTemplate({ mask: ellipse, dimensions, depth: 200 });

    expect(result.warnings).toContainEqual({
      code: "EXACT_SIZE_NEEDS_DISTORTION",
    });
  });

  it("should warn when the image cannot resolve the requested detail", () => {
    const result = generateTemplate({
      mask: ellipse,
      dimensions,
      depth: 200,
      simplificationTolerance: 0.1,
    });

    const warning = result.warnings.find(
      (candidate) => candidate.code === "DETAIL_LIMITED_BY_RESOLUTION",
    );

    expect(warning).toBeDefined();
  });

  it("should warn when it left other figures out", () => {
    const withSpeck = maskOf(
      (x, y) =>
        Math.hypot((x - 200) / 150, (y - 250) / 200) <= 1 || (x < 5 && y < 5),
    );

    const result = generateTemplate({
      mask: withSpeck,
      dimensions,
      depth: 200,
    });

    expect(result.warnings).toContainEqual({
      code: "OTHER_FIGURES_DISCARDED",
      count: 1,
    });
  });

  it("should refuse to choose between two figures of comparable size", () => {
    const two = maskOf(
      (x, y) =>
        (x < 150 && x > 20 && y > 100 && y < 400) ||
        (x > 250 && x < 380 && y > 100 && y < 400),
    );

    expect(() =>
      generateTemplate({ mask: two, dimensions, depth: 200 }),
    ).toThrow(AmbiguousSubjectError);
  });

  it("should refuse a figure with a hole", () => {
    const ring = maskOf(
      (x, y) =>
        Math.hypot((x - 200) / 150, (y - 250) / 200) <= 1 &&
        Math.hypot((x - 200) / 60, (y - 250) / 80) > 1,
    );

    // Un hueco es una pared interior y necesita su propia tira.
    // Ver template.md §121.
    expect(() =>
      generateTemplate({ mask: ring, dimensions, depth: 200 }),
    ).toThrow(UnsupportedSilhouetteError);
  });

  it("should produce the same template from the same mask", () => {
    expect(generateTemplate({ mask: ellipse, dimensions, depth: 200 })).toEqual(
      generateTemplate({ mask: ellipse, dimensions, depth: 200 }),
    );
  });
});
