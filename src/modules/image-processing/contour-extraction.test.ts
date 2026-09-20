import { describe, expect, it } from "vitest";

import { createDimensions } from "../geometry/dimensions";
import { traceMaskOutline } from "./contour-extraction";
import { convertContourToPhysicalGeometry } from "./contour-to-geometry";
import { InvalidContourError } from "./errors";
import { createBinaryMask, type BinaryMask } from "./mask";
import type { PixelPoint } from "./pixel-contour";

/** Máscara escrita a mano: `#` es figura y `.` es fondo. */
function maskOf(rows: readonly string[]): BinaryMask {
  const width = rows[0].length;
  const foreground = new Uint8Array(width * rows.length);

  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      foreground[y * width + x] = cell === "#" ? 1 : 0;
    });
  });

  return createBinaryMask(width, rows.length, foreground);
}

function sorted(points: readonly PixelPoint[]): PixelPoint[] {
  return [...points].sort((a, b) => a.y - b.y || a.x - b.x);
}

describe("Contour extraction", () => {
  it("should trace a rectangle as its four corners", () => {
    const outline = traceMaskOutline(
      maskOf([
        ".....",
        ".###.",
        ".###.",
        ".....",
      ]),
    );

    // El trazo sigue el borde exterior de los pixels, no sus centros: la
    // figura ocupa de (1,1) a (4,3), no de (1,1) a (3,2).
    expect(sorted(outline.outer)).toEqual([
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 1, y: 3 },
      { x: 4, y: 3 },
    ]);
    expect(outline.holes).toHaveLength(0);
  });

  it("should trace a single pixel as a unit square", () => {
    const outline = traceMaskOutline(maskOf(["...", ".#.", "..."]));

    expect(sorted(outline.outer)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });

  it("should keep every corner of a shape that is not a rectangle", () => {
    const outline = traceMaskOutline(
      maskOf([
        "......",
        ".##...",
        ".##...",
        ".####.",
        "......",
      ]),
    );

    expect(outline.outer).toHaveLength(6);
  });

  it("should separate the hole of a figure from its outline", () => {
    const outline = traceMaskOutline(
      maskOf([
        "......",
        ".####.",
        ".#..#.",
        ".####.",
        "......",
      ]),
    );

    expect(sorted(outline.outer)).toEqual([
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 1, y: 4 },
      { x: 5, y: 4 },
    ]);
    expect(outline.holes).toHaveLength(1);
    expect(sorted(outline.holes[0])).toEqual([
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 3 },
      { x: 4, y: 3 },
    ]);
  });

  it("should treat two parts that touch by a corner as one figure", () => {
    // El papel no se separa por una esquina, así que el contorno rodea las
    // dos partes en lugar de tratarlas como figuras distintas.
    const outline = traceMaskOutline(maskOf(["#.", ".#"]));

    expect(outline.outer.length).toBeGreaterThan(4);
    expect(outline.holes).toHaveLength(0);
  });

  it("should refuse a mask that contains more than one figure", () => {
    expect(() =>
      traceMaskOutline(
        maskOf([
          "#..#",
          "#..#",
        ]),
      ),
    ).toThrow(InvalidContourError);
  });

  it("should refuse a mask without any figure", () => {
    expect(() => traceMaskOutline(maskOf(["..", ".."]))).toThrow(
      InvalidContourError,
    );
  });

  it("should produce a contour the physical conversion can consume", () => {
    // La costura que importa: lo que sale de la máscara entra en el único
    // punto donde los pixels se convierten en milímetros.
    const outline = traceMaskOutline(
      maskOf([
        "......",
        ".####.",
        ".####.",
        "......",
      ]),
    );

    const physical = convertContourToPhysicalGeometry({
      contour: outline.outer,
      targetDimensions: createDimensions(800, 1000),
    });

    // La figura mide 4 × 2 px, así que contenida en 800 × 1000 mm da
    // 800 × 400 mm: el lado largo manda y la proporción se conserva.
    expect(physical.dimensions).toEqual({ width: 800, height: 400 });
    expect(physical.requiresDistortionForExactFit).toBe(true);
  });

  it("should trace the same mask the same way every time", () => {
    const mask = maskOf([
      "......",
      ".####.",
      ".#..#.",
      ".####.",
      "......",
    ]);

    expect(traceMaskOutline(mask)).toEqual(traceMaskOutline(mask));
  });
});
