import { describe, expect, it } from "vitest";

import { boundingBoxDimensions } from "./geometry/bounding-box";
import { createDimensions } from "./geometry/dimensions";
import { polygonPerimeter } from "./geometry/polygon";
import { templateGeometryBounds } from "./geometry/template-geometry";
import { traceMaskOutline } from "./image-processing/contour-extraction";
import { convertContourToPhysicalGeometry } from "./image-processing/contour-to-geometry";
import { createAlphaMask, thresholdAlphaMask } from "./image-processing/mask";
import {
  isolateComponent,
  labelForegroundComponents,
  selectMainSubject,
} from "./image-processing/mask-components";
import { createPrintLayout } from "./printing/print-layout";
import { deriveAssembly, validateAssembly } from "./templates/assembly";
import {
  DEFAULT_EXTRUSION_CONFIGURATION,
  deriveTemplateFromSilhouette,
} from "./templates/perimeter-extrusion";
import { templatePiecesWithRole } from "./templates/template";

/**
 * La cadena completa, de la máscara a las piezas impresas.
 *
 * Cada módulo tiene sus propias pruebas, pero hay errores que solo existen en
 * la costura: una simplificación demasiado fina deja el contorno hecho una
 * escalera, y el perímetro resultante —que es la longitud de la tira
 * lateral— sale un 26 % largo sin que ningún módulo por separado haga nada
 * incorrecto. Una piñata con la tira un 26 % larga no cierra.
 */

const IMAGE_WIDTH = 600;
const IMAGE_HEIGHT = 800;
const SEMI_AXIS_X = 250;
const SEMI_AXIS_Y = 350;

/** Elipse dibujada en el canal alfa, como la dejaría una segmentación. */
function ellipseMask() {
  const alpha = new Uint8Array(IMAGE_WIDTH * IMAGE_HEIGHT);

  for (let y = 0; y < IMAGE_HEIGHT; y++) {
    for (let x = 0; x < IMAGE_WIDTH; x++) {
      const inside =
        Math.hypot(
          (x - IMAGE_WIDTH / 2) / SEMI_AXIS_X,
          (y - IMAGE_HEIGHT / 2) / SEMI_AXIS_Y,
        ) <= 1;

      alpha[y * IMAGE_WIDTH + x] = inside ? 255 : 0;
    }
  }

  return createAlphaMask(IMAGE_WIDTH, IMAGE_HEIGHT, alpha);
}

/** Perímetro exacto de una elipse, por la aproximación de Ramanujan. */
function ellipsePerimeter(a: number, b: number): number {
  const h = (a - b) ** 2 / (a + b) ** 2;

  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function silhouetteFromMask() {
  const binary = thresholdAlphaMask(ellipseMask());
  const labeling = labelForegroundComponents(binary);
  const isolated = isolateComponent(
    binary,
    labeling,
    selectMainSubject(labeling).component,
  );

  return convertContourToPhysicalGeometry({
    contour: traceMaskOutline(isolated).outer,
    targetDimensions: createDimensions(800, 1000),
  });
}

describe("Image to template pipeline", () => {
  it("should keep the perimeter of the figure the image described", () => {
    const physical = silhouetteFromMask();
    const size = physical.dimensions;
    const expected = ellipsePerimeter(size.width / 2, size.height / 2);

    // La tira lateral mide exactamente esto. Un perímetro inflado por la
    // escalera de pixels produce una tira que no cierra la figura.
    expect(polygonPerimeter(physical.polygon)).toBeCloseTo(expected, -1);
  });

  it("should cover the perimeter with the side pieces", () => {
    const physical = silhouetteFromMask();
    const template = deriveTemplateFromSilhouette({
      silhouette: physical.polygon,
      depth: 200,
    });

    const covered = templatePiecesWithRole(template, "SIDE").reduce(
      (total, side) =>
        total +
        boundingBoxDimensions(templateGeometryBounds(side.geometry)).width -
        DEFAULT_EXTRUSION_CONFIGURATION.tabWidth,
      0,
    );

    expect(covered).toBeCloseTo(polygonPerimeter(physical.polygon), 6);
  });

  it("should produce side pieces that fit the width of a sheet", () => {
    const physical = silhouetteFromMask();
    const template = deriveTemplateFromSilhouette({
      silhouette: physical.polygon,
      depth: 200,
    });

    for (const side of templatePiecesWithRole(template, "SIDE")) {
      const layout = createPrintLayout(side.geometry);

      // Una pieza lateral que se sale a una segunda columna desperdicia una
      // hoja entera. Ver template.md §114.
      expect(layout.columns).toBe(1);
    }
  });

  it("should produce a template that can be assembled", () => {
    const physical = silhouetteFromMask();
    const template = deriveTemplateFromSilhouette({
      silhouette: physical.polygon,
      depth: 200,
    });

    const assembly = deriveAssembly(template);

    expect(() => validateAssembly(template, assembly)).not.toThrow();
  });

  it("should produce the same template from the same image", () => {
    const first = silhouetteFromMask();
    const second = silhouetteFromMask();

    expect(
      deriveTemplateFromSilhouette({ silhouette: first.polygon, depth: 200 }),
    ).toEqual(
      deriveTemplateFromSilhouette({ silhouette: second.polygon, depth: 200 }),
    );
  });
});
