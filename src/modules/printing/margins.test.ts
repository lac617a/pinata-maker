import { describe, expect, it } from "vitest";

import { EmptyPrintableAreaError, InvalidMarginError } from "./errors";
import { calculatePrintableArea, uniformMargins } from "./margins";
import { paperSize } from "./paper-format";

describe("Printable area", () => {
  it("should subtract the margins from the sheet", () => {
    const printable = calculatePrintableArea(
      paperSize("A4", "PORTRAIT"),
      uniformMargins(5),
    );

    expect(printable).toEqual({ width: 200, height: 287 });
  });

  it("should support different margins per side", () => {
    const printable = calculatePrintableArea(paperSize("A4", "PORTRAIT"), {
      top: 10,
      right: 5,
      bottom: 20,
      left: 15,
    });

    expect(printable).toEqual({ width: 190, height: 267 });
  });

  it("should remain smaller than the paper it belongs to", () => {
    const paper = paperSize("A3", "LANDSCAPE");
    const printable = calculatePrintableArea(paper, uniformMargins(5));

    expect(printable.width).toBeLessThan(paper.width);
    expect(printable.height).toBeLessThan(paper.height);
  });

  it("should reject negative margins", () => {
    expect(() =>
      calculatePrintableArea(paperSize("A4", "PORTRAIT"), uniformMargins(-1)),
    ).toThrow(InvalidMarginError);
  });

  it("should reject margins that consume the entire sheet", () => {
    expect(() =>
      calculatePrintableArea(paperSize("A4", "PORTRAIT"), uniformMargins(150)),
    ).toThrow(EmptyPrintableAreaError);
  });
});
