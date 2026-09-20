import { describe, expect, it } from "vitest";

import { InvalidPdfGeometryError } from "./errors";
import { millimetersToPoints, pointsEqual } from "./pdf-units";

describe("PDF units", () => {
  it("should convert an inch into 72 points", () => {
    expect(millimetersToPoints(25.4)).toBe(72);
  });

  it("should convert the sides of an A4 sheet", () => {
    expect(millimetersToPoints(210)).toBeCloseTo(595.2756, 4);
    expect(millimetersToPoints(297)).toBeCloseTo(841.8898, 4);
  });

  it("should keep the conversion proportional", () => {
    expect(millimetersToPoints(200)).toBe(millimetersToPoints(100) * 2);
  });

  it("should leave the origin untouched", () => {
    expect(millimetersToPoints(0)).toBe(0);
  });

  it("should not round the converted value", () => {
    // 100 mm no tiene una representación exacta en puntos: redondear aquí
    // acumularía error en cada coordenada de la plantilla.
    expect(millimetersToPoints(100)).not.toBe(283.46);
    expect(millimetersToPoints(100)).toBeCloseTo(283.4646, 4);
  });

  it("should reject a value that does not represent a measurable length", () => {
    expect(() => millimetersToPoints(Number.NaN)).toThrow(
      InvalidPdfGeometryError,
    );
    expect(() => millimetersToPoints(Number.POSITIVE_INFINITY)).toThrow(
      InvalidPdfGeometryError,
    );
  });

  it("should compare points within the printing tolerance", () => {
    expect(pointsEqual(595.2756, 595.28)).toBe(true);
    expect(pointsEqual(595.2756, 595.5)).toBe(false);
  });
});
