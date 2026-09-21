import { describe, expect, it } from "vitest";

import { createPoint } from "@/modules/geometry/point";
import { createPolygon } from "@/modules/geometry/polygon";

import { type Assembly, deriveAssembly, validateAssembly } from "./assembly";
import { InvalidAssemblyError } from "./errors";
import { deriveTemplateFromSilhouette } from "./perimeter-extrusion";
import { type Template, templatePiecesWithRole } from "./template";

const square = createPolygon(
  [
    createPoint(0, 0),
    createPoint(400, 0),
    createPoint(400, 400),
    createPoint(0, 400),
  ],
  true,
);

const template = deriveTemplateFromSilhouette({
  silhouette: square,
  depth: 200,
});
const assembly = deriveAssembly(template);
const sides = templatePiecesWithRole(template, "SIDE").map((side) => side.id);

describe("Assembly", () => {
  it("should attach every side piece to both faces", () => {
    for (const side of sides) {
      expect(
        assembly.connections.some(
          (link) => link.fromPiece === side && link.toPiece === "FRONT",
        ),
      ).toBe(true);
      expect(
        assembly.connections.some(
          (link) => link.fromPiece === side && link.toPiece === "BACK",
        ),
      ).toBe(true);
    }
  });

  it("should close the ring of side pieces", () => {
    const last = sides[sides.length - 1];

    expect(
      assembly.connections.some(
        (link) => link.fromPiece === last && link.toPiece === sides[0],
      ),
    ).toBe(true);
  });

  it("should leave no piece out of the assembly", () => {
    const connected = new Set(
      assembly.connections.flatMap((link) => [link.fromPiece, link.toPiece]),
    );

    for (const piece of template.pieces) {
      expect(connected.has(piece.id)).toBe(true);
    }
  });

  it("should start every connection at the piece that owns the tab", () => {
    // Las pestañas viven en la tira, así que ninguna conexión puede salir de
    // una cara. Ver template.md §115 y assembly.md §100.
    for (const link of assembly.connections) {
      expect(sides).toContain(link.fromPiece);
    }
  });

  it("should fold the strip before attaching it to anything", () => {
    const fold = assembly.steps.find((step) =>
      step.actions.some((action) => action.type === "FOLD"),
    );
    const firstAttach = assembly.steps.find((step) =>
      step.actions.some((action) => action.type === "ATTACH"),
    );

    expect(fold!.order).toBeLessThan(firstAttach!.order);
  });

  it("should attach the back face before the front one", () => {
    const attachTo = (face: string) =>
      assembly.steps.find((step) =>
        step.actions.some(
          (action) => action.type === "ATTACH" && action.pieces.includes(face),
        ),
      )!.order;

    expect(attachTo("BACK")).toBeLessThan(attachTo("FRONT"));
  });

  it("should end by closing the piñata, not by attaching a piece", () => {
    // Una piñata que se pega del todo no puede rellenarse: el último paso es
    // cerrar la boca. Ver assembly.md §103.
    const last = assembly.steps[assembly.steps.length - 1];

    expect(last.actions.every((action) => action.type === "CLOSE")).toBe(true);
  });

  it("should number the steps in order", () => {
    expect(assembly.steps.map((step) => step.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("should accept an assembly it derived itself", () => {
    expect(() => validateAssembly(template, assembly)).not.toThrow();
  });

  it("should reject a ring that does not close", () => {
    const broken: Assembly = {
      ...assembly,
      connections: assembly.connections.filter(
        (link) =>
          !(
            link.fromPiece === sides[sides.length - 1] &&
            link.toPiece === sides[0]
          ),
      ),
    };

    expect(() => validateAssembly(template, broken)).toThrow(
      InvalidAssemblyError,
    );
  });

  it("should reject a side piece that is not attached to a face", () => {
    const detached: Assembly = {
      ...assembly,
      connections: assembly.connections.filter(
        (link) => !(link.fromPiece === sides[0] && link.toPiece === "FRONT"),
      ),
    };

    expect(() => validateAssembly(template, detached)).toThrow(
      InvalidAssemblyError,
    );
  });

  it("should reject a template with no volume", () => {
    const flat: Template = {
      ...template,
      pieces: template.pieces.filter((piece) => piece.role !== "SIDE"),
    };

    expect(() => deriveAssembly(flat)).toThrow(InvalidAssemblyError);
  });

  it("should join the two ends of a single side piece", () => {
    const small = deriveTemplateFromSilhouette({
      silhouette: createPolygon(
        [createPoint(0, 0), createPoint(50, 0), createPoint(25, 40)],
        true,
      ),
      depth: 60,
    });

    const ring = deriveAssembly(small);
    const [only] = templatePiecesWithRole(small, "SIDE");

    expect(templatePiecesWithRole(small, "SIDE")).toHaveLength(1);
    expect(
      ring.connections.some(
        (link) => link.fromPiece === only.id && link.toPiece === only.id,
      ),
    ).toBe(true);
    expect(() => validateAssembly(small, ring)).not.toThrow();
  });
});
