import { describe, expect, it } from "vitest";

import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";

import { InvalidTemplateDefinitionError } from "./errors";
import { type Template, TEMPLATE_DERIVATION_VERSION } from "./template";
import {
  deserializeTemplate,
  serializeTemplate,
  TEMPLATE_DEFINITION_LIMITS,
  TEMPLATE_SCHEMA_VERSION,
} from "./template-definition";

/** Una plantilla con las cuatro clases de trazo que existen. */
function template(): Template {
  const square = createPolygon(
    [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 150 },
      { x: 0, y: 150 },
    ],
    true,
  );

  const hole = createPolygon(
    [
      { x: 80, y: 60 },
      { x: 120, y: 60 },
      { x: 120, y: 90 },
    ],
    true,
  );

  const fold = createPolygon(
    [
      { x: 0, y: 75 },
      { x: 200, y: 75 },
    ],
    false,
  );

  const cut = createPolygon(
    [
      { x: 10, y: 10 },
      { x: 40, y: 10 },
    ],
    false,
  );

  return {
    name: "Elefante",
    width: 200,
    height: 150,
    depth: 40,
    derivationVersion: TEMPLATE_DERIVATION_VERSION,
    pieces: [
      {
        id: "FRONT-1",
        role: "FRONT",
        geometry: createTemplateGeometry({
          outerContours: [square],
          holes: [hole],
          cutLines: [{ geometry: cut }],
          foldLines: [{ geometry: fold }],
        }),
      },
      {
        id: "SIDE-1",
        role: "SIDE",
        geometry: createTemplateGeometry({ outerContours: [square] }),
      },
    ],
  };
}

/** Lo que de verdad ocurre al guardar: el documento pasa por JSON. */
function roundTrip(value: Template): Template {
  return deserializeTemplate(
    JSON.parse(JSON.stringify(serializeTemplate(value))),
  );
}

describe("Template definition", () => {
  it("should return the same template after a round trip", () => {
    const original = template();

    // Reimprimir una plantilla guardada tiene que dar exactamente el mismo
    // molde: si la ida y la vuelta pierden algo, el papel ya recortado deja
    // de encajar. Ver docs/storage.md §17.
    expect(roundTrip(original)).toEqual(original);
  });

  it("should keep the derivation version of the original", () => {
    // Es lo que permite saber con qué reglas se hizo una plantilla antigua
    // cuando el reparto de pestañas cambie. Ver docs/template.md §94.
    expect(roundTrip(template()).derivationVersion).toBe(
      TEMPLATE_DERIVATION_VERSION,
    );
  });

  it("should not confuse a cut line with a fold line", () => {
    const [front] = roundTrip(template()).pieces;

    // Un pliegue impreso como corte parte la pieza en dos.
    expect(front.geometry.cutLines).toHaveLength(1);
    expect(front.geometry.foldLines).toHaveLength(1);
    expect(front.geometry.foldLines[0].geometry.closed).toBe(false);
  });

  it("should declare the schema it was written with", () => {
    expect(serializeTemplate(template()).schemaVersion).toBe(
      TEMPLATE_SCHEMA_VERSION,
    );
  });

  it("should refuse a document written with another schema", () => {
    const definition = {
      ...serializeTemplate(template()),
      schemaVersion: TEMPLATE_SCHEMA_VERSION + 1,
    };

    // Leerlo «lo mejor posible» produciría una plantilla silenciosamente
    // distinta. Ver docs/storage.md §34.
    expect(() => deserializeTemplate(definition)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse an open outer contour", () => {
    const definition = serializeTemplate(template());
    const [front, ...rest] = definition.pieces;

    const opened = {
      ...definition,
      pieces: [
        {
          ...front,
          geometry: {
            ...front.geometry,
            outerContours: [
              { ...front.geometry.outerContours[0], closed: false },
            ],
          },
        },
        ...rest,
      ],
    };

    // Un contorno abierto no delimita una superficie: debe fallar al leerlo y
    // no al imprimirlo.
    expect(() => deserializeTemplate(opened)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse a coordinate that is not a finite number", () => {
    const definition = serializeTemplate(template());
    const [front, ...rest] = definition.pieces;

    const broken = {
      ...definition,
      pieces: [
        {
          ...front,
          geometry: {
            ...front.geometry,
            outerContours: [
              {
                closed: true,
                points: [
                  [0, 0],
                  [10, 0],
                  // `JSON.stringify` convierte un infinito en `null`: así es
                  // como llega de verdad un documento corrupto.
                  [null, 10],
                ],
              },
            ],
          },
        },
        ...rest,
      ],
    };

    expect(() => deserializeTemplate(broken)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse a point that is not a pair of coordinates", () => {
    const definition = serializeTemplate(template());
    const [front, ...rest] = definition.pieces;

    const broken = {
      ...definition,
      pieces: [
        {
          ...front,
          geometry: {
            ...front.geometry,
            outerContours: [
              {
                closed: true,
                points: [
                  [0, 0],
                  [10, 0],
                  [10, 10, 10],
                ],
              },
            ],
          },
        },
        ...rest,
      ],
    };

    expect(() => deserializeTemplate(broken)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse a piece with a role it does not know", () => {
    const definition = serializeTemplate(template());

    const broken = {
      ...definition,
      pieces: definition.pieces.map((piece) => ({ ...piece, role: "LID" })),
    };

    expect(() => deserializeTemplate(broken)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse a template without pieces", () => {
    expect(() =>
      deserializeTemplate({ ...serializeTemplate(template()), pieces: [] }),
    ).toThrow(InvalidTemplateDefinitionError);
  });

  it("should refuse more pieces than the limit", () => {
    const definition = serializeTemplate(template());
    const [front] = definition.pieces;

    const flooded = {
      ...definition,
      pieces: Array.from(
        { length: TEMPLATE_DEFINITION_LIMITS.maxPieces + 1 },
        (_unused, index) => ({ ...front, id: `SIDE-${index}` }),
      ),
    };

    // Un documento sin techo es una forma barata de llenar la base de datos.
    expect(() => deserializeTemplate(flooded)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse more points than the limit", () => {
    const definition = serializeTemplate(template());
    const [front, ...rest] = definition.pieces;

    const points = Array.from(
      { length: TEMPLATE_DEFINITION_LIMITS.maxPoints + 1 },
      (_unused, index) => [index, index] as const,
    );

    const flooded = {
      ...definition,
      pieces: [
        {
          ...front,
          geometry: {
            ...front.geometry,
            outerContours: [{ points, closed: true }],
          },
        },
        ...rest,
      ],
    };

    expect(() => deserializeTemplate(flooded)).toThrow(
      InvalidTemplateDefinitionError,
    );
  });

  it("should refuse something that is not a document at all", () => {
    for (const value of [null, "template", 7, []]) {
      expect(() => deserializeTemplate(value)).toThrow(
        InvalidTemplateDefinitionError,
      );
    }
  });
});
