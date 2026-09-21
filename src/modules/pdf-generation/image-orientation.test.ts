import { describe, expect, it } from "vitest";

import { applyTransform, orientationTransform } from "./image-orientation";

/** Destino ya girado: 30 de ancho, 50 de alto, con la esquina en (10, 20). */
const target = { x: 10, y: 20, width: 30, height: 50 };

/** Dónde acaba cada esquina de los bytes guardados. */
function corners(orientation: number) {
  const { drawWidth, drawHeight, transform } = orientationTransform(
    orientation,
    target,
  );
  const at = (s: number, t: number) =>
    applyTransform(transform, { x: s, y: t });

  return {
    drawWidth,
    drawHeight,
    topLeft: at(0, 0),
    topRight: at(drawWidth, 0),
    bottomLeft: at(0, drawHeight),
  };
}

describe("Image orientation", () => {
  it("should draw an upright image as it is", () => {
    expect(corners(1)).toEqual({
      drawWidth: 30,
      drawHeight: 50,
      topLeft: { x: 10, y: 20 },
      topRight: { x: 40, y: 20 },
      bottomLeft: { x: 10, y: 70 },
    });
  });

  it("should turn a phone photo a quarter to the right", () => {
    // Orientación 6: el móvil en vertical guarda la foto tumbada. Lo que en
    // los bytes es la esquina superior izquierda se ve arriba a la derecha.
    const turned = corners(6);

    expect(turned.drawWidth).toBe(50);
    expect(turned.drawHeight).toBe(30);
    expect(turned.topLeft).toEqual({ x: 40, y: 20 });
    expect(turned.topRight).toEqual({ x: 40, y: 70 });
    expect(turned.bottomLeft).toEqual({ x: 10, y: 20 });
  });

  it("should turn a quarter to the left", () => {
    const turned = corners(8);

    expect(turned.topLeft).toEqual({ x: 10, y: 70 });
    expect(turned.topRight).toEqual({ x: 10, y: 20 });
  });

  it("should turn half a turn", () => {
    const turned = corners(3);

    expect(turned.topLeft).toEqual({ x: 40, y: 70 });
    expect(turned.bottomLeft).toEqual({ x: 40, y: 20 });
  });

  it("should fill exactly the target in every orientation", () => {
    for (let orientation = 1; orientation <= 8; orientation++) {
      const { drawWidth, drawHeight, transform } = orientationTransform(
        orientation,
        target,
      );
      const points = [
        [0, 0],
        [drawWidth, 0],
        [0, drawHeight],
        [drawWidth, drawHeight],
      ].map(([x, y]) => applyTransform(transform, { x, y }));

      expect(Math.min(...points.map((p) => p.x))).toBe(10);
      expect(Math.max(...points.map((p) => p.x))).toBe(40);
      expect(Math.min(...points.map((p) => p.y))).toBe(20);
      expect(Math.max(...points.map((p) => p.y))).toBe(70);
    }
  });

  it("should treat an unknown orientation as upright", () => {
    expect(corners(0).topLeft).toEqual(corners(1).topLeft);
  });
});
