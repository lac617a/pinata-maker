import { describe, expect, it } from "vitest";

import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";

import {
  referenceImageOnFace,
  type Template,
  TEMPLATE_DERIVATION_VERSION,
  type TemplatePiece,
} from "./template";

/** Una cara de 200 × 100 mm, que es lo único que importa aquí. */
function face(role: TemplatePiece["role"], id: string = role): TemplatePiece {
  return {
    id,
    role,
    geometry: createTemplateGeometry({
      outerContours: [
        createPolygon(
          [
            { x: 0, y: 0 },
            { x: 200, y: 0 },
            { x: 200, y: 100 },
            { x: 0, y: 100 },
          ],
          true,
        ),
      ],
    }),
  };
}

const template: Template = {
  name: "Cara",
  width: 200,
  height: 100,
  depth: 50,
  derivationVersion: TEMPLATE_DERIVATION_VERSION,
  pieces: [face("FRONT"), face("BACK"), face("SIDE", "SIDE-1")],
  referenceImage: { x: -20, y: -10, width: 260, height: 120 },
};

describe("Reference image on a face", () => {
  it("should place the image on the front as it was derived", () => {
    expect(referenceImageOnFace(template, template.pieces[0])).toEqual({
      placement: { x: -20, y: -10, width: 260, height: 120 },
      mirrored: false,
    });
  });

  it("should mirror the image on the back within the face width", () => {
    // La espalda es x → 200 − x. La imagen ocupaba de −20 a 240, así que
    // reflejada ocupa de −40 a 220 y además va volteada.
    expect(referenceImageOnFace(template, template.pieces[1])).toEqual({
      placement: { x: -40, y: -10, width: 260, height: 120 },
      mirrored: true,
    });
  });

  it("should not place the image on a side piece", () => {
    expect(referenceImageOnFace(template, template.pieces[2])).toBeNull();
  });

  it("should place nothing when the template has no image", () => {
    const { referenceImage: _unused, ...withoutImage } = template;

    expect(referenceImageOnFace(withoutImage, template.pieces[0])).toBeNull();
  });
});
