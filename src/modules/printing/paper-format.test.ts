import { describe, expect, it } from "vitest";

import { InvalidPaperFormatError } from "./errors";
import { PAPER_FORMATS, type PaperFormat, paperSize } from "./paper-format";

describe("PaperFormat", () => {
  it("should expose the official portrait dimensions of every supported format", () => {
    expect(paperSize("A4", "PORTRAIT")).toEqual({ width: 210, height: 297 });
    expect(paperSize("A3", "PORTRAIT")).toEqual({ width: 297, height: 420 });
    expect(paperSize("LETTER", "PORTRAIT")).toEqual({
      width: 215.9,
      height: 279.4,
    });
  });

  it("should swap the sides in landscape orientation", () => {
    expect(paperSize("A4", "LANDSCAPE")).toEqual({ width: 297, height: 210 });
  });

  it("should keep the same physical area regardless of orientation", () => {
    for (const format of PAPER_FORMATS) {
      const portrait = paperSize(format, "PORTRAIT");
      const landscape = paperSize(format, "LANDSCAPE");

      expect(portrait.width * portrait.height).toBeCloseTo(
        landscape.width * landscape.height,
        10,
      );
    }
  });

  it("should reject an unsupported paper format", () => {
    expect(() => paperSize("A2" as PaperFormat, "PORTRAIT")).toThrow(
      InvalidPaperFormatError,
    );
  });
});
