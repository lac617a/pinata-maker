import { describe, expect, it } from "vitest";

import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";

import {
  isPosterJoining,
  joiningOf,
  posterPrintConfiguration,
} from "./joining";
import { posterLayout, posterSideForSheets } from "./poster";

const a4 = { format: "A4" as const, orientation: "PORTRAIT" as const };

describe("Poster joining", () => {
  it("should overlap 1 cm by default", () => {
    const print = posterPrintConfiguration(a4, "OVERLAP");

    expect(print.overlap).toBe(10);
    expect(joiningOf(print)).toBe("OVERLAP");
    expect(joiningOf(DEFAULT_PRINT_CONFIGURATION)).toBe("OVERLAP");
  });

  it("should not overlap when the sheets are trimmed", () => {
    const print = posterPrintConfiguration(a4, "TRIM");

    expect(print.overlap).toBe(0);
    expect(joiningOf(print)).toBe("TRIM");
  });

  it("should cover more with the same sheets when trimming", () => {
    // Sin franja repetida, tres hojas de ancho llegan 2 cm más lejos.
    const overlap = posterSideForSheets(
      3,
      "width",
      posterPrintConfiguration(a4, "OVERLAP"),
    );
    const trim = posterSideForSheets(
      3,
      "width",
      posterPrintConfiguration(a4, "TRIM"),
    );

    expect(trim - overlap).toBe(20);
  });

  it("should lay out sheets that meet edge to edge when trimming", () => {
    const print = posterPrintConfiguration(a4, "TRIM");
    const layout = posterLayout({ width: 600, height: 287 }, print);
    const [first, second] = layout.pages;

    expect(second.globalBounds.minX).toBe(first.globalBounds.maxX);
  });

  it("should recognise only the known joinings", () => {
    expect(isPosterJoining("TRIM")).toBe(true);
    expect(isPosterJoining("GLUE")).toBe(false);
    expect(isPosterJoining(undefined)).toBe(false);
  });
});
