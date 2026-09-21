import { describe, expect, it } from "vitest";

import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";

import { InvalidPosterSizeError } from "./errors";
import {
  createPoster,
  lastSheetUsage,
  POSTER_LIMITS,
  posterLayout,
  posterSideForSheets,
} from "./poster";

/** Las proporciones de la imagen de ejemplo: un 4 con Spider-Man. */
const image = { width: 720, height: 894 };

describe("Poster", () => {
  it("should keep the proportion of the image from its width", () => {
    const poster = createPoster(image, { width: 600 });

    // El alto sale de la imagen: pedir las dos medidas deformaría la figura.
    expect(poster.width).toBe(600);
    expect(poster.height).toBeCloseTo(600 * (894 / 720), 6);
  });

  it("should keep the proportion of the image from its height", () => {
    const poster = createPoster(image, { height: 894 });

    expect(poster.width).toBeCloseTo(720, 6);
  });

  it("should refuse a size too small to need several sheets", () => {
    expect(() => createPoster(image, { width: 50 })).toThrow(
      InvalidPosterSizeError,
    );
  });

  it("should refuse a size that stops being a piñata", () => {
    expect(() =>
      createPoster(image, { height: POSTER_LIMITS.maxSide + 1 }),
    ).toThrow(InvalidPosterSizeError);
  });

  it("should refuse a side derived out of range, not only the one asked", () => {
    // 2,9 m de ancho está dentro del límite, pero con esta proporción el alto
    // pasaría de 3 m.
    expect(() => createPoster(image, { width: 2900 })).toThrow(
      InvalidPosterSizeError,
    );
  });

  it("should refuse a measure that is not a number", () => {
    expect(() => createPoster(image, { width: Number.NaN })).toThrow(
      InvalidPosterSizeError,
    );
  });

  it("should split a 60 cm poster into sheets it fully covers", () => {
    const poster = createPoster(image, { width: 600 });
    const layout = posterLayout(poster, DEFAULT_PRINT_CONFIGURATION);

    // Cada punto del póster cae en alguna hoja: nada se queda sin imprimir.
    const last = layout.pages[layout.pages.length - 1].globalBounds;

    expect(layout.columns * layout.rows).toBe(layout.pages.length);
    expect(last.maxX).toBeGreaterThanOrEqual(poster.width);
    expect(last.maxY).toBeGreaterThanOrEqual(poster.height);
  });

  it("should need more sheets for a larger poster", () => {
    const small = posterLayout(
      createPoster(image, { width: 400 }),
      DEFAULT_PRINT_CONFIGURATION,
    );
    const large = posterLayout(
      createPoster(image, { width: 1200 }),
      DEFAULT_PRINT_CONFIGURATION,
    );

    expect(large.pages.length).toBeGreaterThan(small.pages.length);
  });
});

describe("Poster that fills whole sheets", () => {
  const print = DEFAULT_PRINT_CONFIGURATION;

  it("should give the width that fills exactly N sheets", () => {
    for (const sheets of [1, 2, 3, 4]) {
      const poster = createPoster(image, {
        width: Math.max(
          POSTER_LIMITS.minSide,
          posterSideForSheets(sheets, "width", print),
        ),
      });

      expect(posterLayout(poster, print).columns).toBe(sheets);
    }
  });

  it("should need one more column a few centimetres past the exact fit", () => {
    const exact = posterSideForSheets(3, "width", print);
    const poster = createPoster(image, { width: exact + 20 });

    // Es el caso que motivó la función: 2 cm más cuestan una hoja entera.
    expect(posterLayout(poster, print).columns).toBe(4);
  });

  it("should report how little of the last column is used", () => {
    const exact = posterSideForSheets(3, "width", print);
    const barely = createPoster(image, { width: exact + 20 });
    const full = createPoster(image, { width: exact });

    expect(
      lastSheetUsage(barely, posterLayout(barely, print), "width"),
    ).toBeLessThan(0.25);
    expect(
      lastSheetUsage(full, posterLayout(full, print), "width"),
    ).toBeGreaterThan(0.95);
  });
});
