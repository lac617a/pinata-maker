import { describe, expect, it } from "vitest";

import { createDimensions } from "../geometry/dimensions";
import { createPoint } from "../geometry/point";
import { createPolygon } from "../geometry/polygon";
import { createTemplateGeometry } from "../geometry/template-geometry";
import {
  CALIBRATION_BAND_HEIGHT_MM,
  placeCalibrationMark,
} from "./calibration";
import { InvalidCalibrationError } from "./errors";

const printableArea = createDimensions(200, 287);
const emptyPage = createTemplateGeometry({});

function horizontalCutLine(y: number, fromX: number, toX: number) {
  return {
    geometry: createPolygon([createPoint(fromX, y), createPoint(toX, y)], false),
  };
}

describe("Calibration mark", () => {
  it("should declare the physical length it represents", () => {
    const mark = placeCalibrationMark({
      geometry: emptyPage,
      printableArea,
      length: 100,
    });

    expect(mark?.length).toBe(100);
  });

  it("should sit in the bottom-left corner of an empty page", () => {
    const mark = placeCalibrationMark({
      geometry: emptyPage,
      printableArea,
      length: 100,
    });

    expect(mark?.position).toEqual({
      x: 0,
      y: 287 - CALIBRATION_BAND_HEIGHT_MM / 2,
    });
  });

  it("should fit entirely within the printable area", () => {
    const mark = placeCalibrationMark({
      geometry: emptyPage,
      printableArea,
      length: 100,
    });

    expect(mark!.position.x + mark!.length).toBeLessThanOrEqual(
      printableArea.width,
    );
    expect(mark!.position.y).toBeLessThanOrEqual(printableArea.height);
  });

  it("should move away from a corner crossed by the template", () => {
    const geometry = createTemplateGeometry({
      cutLines: [horizontalCutLine(283, 0, 60)],
    });

    const mark = placeCalibrationMark({
      geometry,
      printableArea,
      length: 100,
    });

    expect(mark?.position.x).toBe(100);
  });

  it("should produce no mark when every corner is occupied", () => {
    const geometry = createTemplateGeometry({
      cutLines: [horizontalCutLine(283, 0, 200), horizontalCutLine(4, 0, 200)],
    });

    expect(
      placeCalibrationMark({ geometry, printableArea, length: 100 }),
    ).toBeUndefined();
  });

  it("should produce no mark when the ruler does not fit on the sheet", () => {
    expect(
      placeCalibrationMark({
        geometry: emptyPage,
        printableArea,
        length: 300,
      }),
    ).toBeUndefined();
  });

  it("should reject a length that cannot be measured", () => {
    expect(() =>
      placeCalibrationMark({ geometry: emptyPage, printableArea, length: 0 }),
    ).toThrow(InvalidCalibrationError);
  });
});
