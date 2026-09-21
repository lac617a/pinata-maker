import { describe, expect, it } from "vitest";

import { AmbiguousSubjectError, EmptyMaskError } from "./errors";
import {
  type BinaryMask,
  createBinaryMask,
  foregroundPixelCount,
} from "./mask";
import {
  isolateComponent,
  labelForegroundComponents,
  selectMainSubject,
} from "./mask-components";

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

describe("Mask components", () => {
  it("should group the pixels of a figure into a single region", () => {
    const labeling = labelForegroundComponents(
      maskOf(["....", ".##.", ".##.", "...."]),
    );

    expect(labeling.components).toHaveLength(1);
    expect(labeling.components[0].area).toBe(4);
    expect(labeling.components[0].bounds).toEqual({
      minX: 1,
      minY: 1,
      maxX: 3,
      maxY: 3,
    });
  });

  it("should join two parts that touch by a corner", () => {
    // Misma vecindad que usa la extracción del contorno: el papel no se
    // separa por una esquina.
    expect(
      labelForegroundComponents(maskOf(["#.", ".#"])).components,
    ).toHaveLength(1);
  });

  it("should tell apart regions that do not touch", () => {
    const labeling = labelForegroundComponents(maskOf(["#.#", "#.#"]));

    expect(labeling.components).toHaveLength(2);
  });

  it("should order the regions by size", () => {
    const labeling = labelForegroundComponents(maskOf(["#..##", "...##"]));

    expect(labeling.components.map((component) => component.area)).toEqual([
      4, 1,
    ]);
  });

  it("should report a mask with no figure", () => {
    expect(() => labelForegroundComponents(maskOf(["..", ".."]))).toThrow(
      EmptyMaskError,
    );
  });

  it("should keep the largest region and report what it left out", () => {
    const labeling = labelForegroundComponents(
      maskOf(["####.", "####.", "####.", ".....", "....#"]),
    );

    const subject = selectMainSubject(labeling);

    expect(subject.component.area).toBe(12);
    expect(subject.discarded).toHaveLength(1);
    expect(subject.discarded[0].area).toBe(1);
  });

  it("should refuse to choose between two figures of comparable size", () => {
    const labeling = labelForegroundComponents(maskOf(["##.##", "##.##"]));

    expect(() => selectMainSubject(labeling)).toThrow(AmbiguousSubjectError);
  });

  it("should leave only the chosen region in the mask", () => {
    const mask = maskOf(["####.", "####.", "####.", ".....", "....#"]);

    const labeling = labelForegroundComponents(mask);
    const isolated = isolateComponent(
      mask,
      labeling,
      selectMainSubject(labeling).component,
    );

    expect(foregroundPixelCount(mask)).toBe(13);
    expect(foregroundPixelCount(isolated)).toBe(12);
  });

  it("should label the same mask the same way every time", () => {
    const mask = maskOf(["#.#", "#.#"]);

    expect(labelForegroundComponents(mask)).toEqual(
      labelForegroundComponents(mask),
    );
  });
});
