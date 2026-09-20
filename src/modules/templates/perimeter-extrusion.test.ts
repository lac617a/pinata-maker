import { describe, expect, it } from "vitest";

import { boundingBoxDimensions } from "../geometry/bounding-box";
import { createPoint } from "../geometry/point";
import {
  createPolygon,
  polygonBounds,
  polygonPerimeter,
  type Polygon,
} from "../geometry/polygon";
import { templateGeometryBounds } from "../geometry/template-geometry";
import {
  InvalidTemplateConfigurationError,
  UnsupportedSilhouetteError,
} from "./errors";
import {
  DEFAULT_EXTRUSION_CONFIGURATION,
  deriveTemplateFromSilhouette,
} from "./perimeter-extrusion";
import { templateFootprint, templatePiecesWithRole } from "./template";

/** Cuadrado de 400 mm: cuatro esquinas de 90° y lados rectos. */
const square = createPolygon(
  [
    createPoint(0, 0),
    createPoint(400, 0),
    createPoint(400, 400),
    createPoint(0, 400),
  ],
  true,
);

/** Círculo aproximado: sin esquinas, curvatura constante. */
function circle(radius: number, steps = 120): Polygon {
  return createPolygon(
    Array.from({ length: steps }, (_, index) => {
      const angle = (index / steps) * 2 * Math.PI;
      return createPoint(
        radius + radius * Math.cos(angle),
        radius + radius * Math.sin(angle),
      );
    }),
    true,
  );
}

const depth = 200;

describe("Perimeter extrusion", () => {
  it("should produce a front, a back and at least one side piece", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });

    expect(templatePiecesWithRole(template, "FRONT")).toHaveLength(1);
    expect(templatePiecesWithRole(template, "BACK")).toHaveLength(1);
    expect(
      templatePiecesWithRole(template, "SIDE").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("should keep the physical size of the figure", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });

    expect(template.width).toBe(400);
    expect(template.height).toBe(400);
    expect(template.depth).toBe(200);
  });

  it("should mirror the back face", () => {
    // Un triángulo asimétrico: reflejarlo cambia la figura, así que la
    // diferencia es observable.
    const wedge = createPolygon(
      [createPoint(0, 0), createPoint(300, 0), createPoint(0, 200)],
      true,
    );

    const template = deriveTemplateFromSilhouette({
      silhouette: wedge,
      depth,
    });

    const [front] = templatePiecesWithRole(template, "FRONT");
    const [back] = templatePiecesWithRole(template, "BACK");

    const xs = (piece: typeof front) =>
      piece.geometry.outerContours[0].points.map((point) => point.x);

    expect(xs(back)).not.toEqual(xs(front));
    // El reflejo conserva el tamaño: solo cambia de lado.
    expect(boundingBoxDimensions(templateGeometryBounds(back.geometry))).toEqual(
      boundingBoxDimensions(templateGeometryBounds(front.geometry)),
    );
  });

  it("should spread the whole perimeter across the side pieces", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });
    const sides = templatePiecesWithRole(template, "SIDE");

    // Cada pieza mide su tramo más la pestaña de unión, que monta sobre la
    // pieza siguiente y por eso no cuenta como perímetro.
    const covered = sides.reduce((total, side) => {
      const size = boundingBoxDimensions(
        templateGeometryBounds(side.geometry),
      );
      return total + size.width - DEFAULT_EXTRUSION_CONFIGURATION.tabWidth;
    }, 0);

    expect(covered).toBeCloseTo(polygonPerimeter(square), 6);
  });

  it("should make the side strip exactly as wide as the depth", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });
    const [side] = templatePiecesWithRole(template, "SIDE");

    const height = boundingBoxDimensions(
      templateGeometryBounds(side.geometry),
    ).height;

    // El cuerpo de la tira más una pestaña a cada lado.
    expect(height).toBe(depth + DEFAULT_EXTRUSION_CONFIGURATION.tabWidth * 2);
  });

  it("should break the strip where the figure turns", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });
    const sides = templatePiecesWithRole(template, "SIDE");

    // Las cuatro esquinas de 90° superan el umbral de doblez, y el lado de
    // 400 mm supera la longitud máxima de pieza, así que se corta en ellas.
    expect(sides.length).toBeGreaterThanOrEqual(4);
  });

  it("should not break a strip that follows a smooth curve", () => {
    const template = deriveTemplateFromSilhouette({
      silhouette: circle(200),
      depth,
      // Sin límite práctico de longitud, para aislar el efecto del giro.
      configuration: { maxSideSegmentLength: 100_000 },
    });

    // Ningún vértice del círculo tuerce 20°, así que la tira sale de una
    // pieza: el cartón curva sin marca. Ver template.md §113.
    expect(templatePiecesWithRole(template, "SIDE")).toHaveLength(1);
  });

  it("should give every side piece tabs on both long edges", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });

    for (const side of templatePiecesWithRole(template, "SIDE")) {
      const { tabWidth } = DEFAULT_EXTRUSION_CONFIGURATION;

      const topTabFolds = side.geometry.foldLines.filter((line) =>
        line.geometry.points.every((point) => point.y === tabWidth),
      );
      const bottomTabFolds = side.geometry.foldLines.filter((line) =>
        line.geometry.points.every((point) => point.y === tabWidth + depth),
      );

      expect(topTabFolds.length).toBeGreaterThan(0);
      expect(topTabFolds).toHaveLength(bottomTabFolds.length);
    }
  });

  it("should shorten the tabs of a tight curve", () => {
    const tabLengthsOn = (radius: number) => {
      const template = deriveTemplateFromSilhouette({
        silhouette: circle(radius),
        depth,
        configuration: { maxSideSegmentLength: 100_000 },
      });

      const [side] = templatePiecesWithRole(template, "SIDE");
      const { tabWidth } = DEFAULT_EXTRUSION_CONFIGURATION;

      return side.geometry.foldLines
        .filter((line) => line.geometry.points.every((p) => p.y === tabWidth))
        .map(
          (line) =>
            line.geometry.points[1].x - line.geometry.points[0].x,
        );
    };

    const wide = tabLengthsOn(400);
    const tight = tabLengthsOn(25);

    expect(Math.max(...tight)).toBeLessThan(Math.max(...wide));
  });

  it("should never let a tab cross a fold line", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });
    const { tabWidth } = DEFAULT_EXTRUSION_CONFIGURATION;

    for (const side of templatePiecesWithRole(template, "SIDE")) {
      const transverse = side.geometry.foldLines.filter(
        (line) => line.geometry.points[0].x === line.geometry.points[1].x,
      );
      const tabs = side.geometry.foldLines.filter((line) =>
        line.geometry.points.every((point) => point.y === tabWidth),
      );

      for (const fold of transverse) {
        const x = fold.geometry.points[0].x;

        for (const tab of tabs) {
          const [start, end] = tab.geometry.points;
          expect(x > start.x && x < end.x).toBe(false);
        }
      }
    }
  });

  it("should leave a short run without tabs instead of deforming one", () => {
    // Un rectángulo muy estrecho: sus lados cortos no llegan al mínimo.
    const sliver = createPolygon(
      [
        createPoint(0, 0),
        createPoint(300, 0),
        createPoint(300, 10),
        createPoint(0, 10),
      ],
      true,
    );

    const template = deriveTemplateFromSilhouette({
      silhouette: sliver,
      depth,
    });

    expect(templatePiecesWithRole(template, "SIDE").length).toBeGreaterThan(0);
  });

  it("should report what the template will cost in paper", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });
    const footprint = templateFootprint(template);

    expect(footprint.pieceCount).toBe(template.pieces.length);
    expect(footprint.totalArea).toBeGreaterThan(400 * 400 * 2);
    expect(["FRONT", "BACK"]).toContain(footprint.largestPiece.id);
  });

  it("should refuse a silhouette with holes", () => {
    expect(() =>
      deriveTemplateFromSilhouette({
        silhouette: square,
        holes: [
          createPolygon(
            [createPoint(100, 100), createPoint(200, 100), createPoint(150, 200)],
            true,
          ),
        ],
        depth,
      }),
    ).toThrow(UnsupportedSilhouetteError);
  });

  it("should refuse a figure without depth", () => {
    expect(() =>
      deriveTemplateFromSilhouette({ silhouette: square, depth: 0 }),
    ).toThrow(UnsupportedSilhouetteError);
  });

  it("should refuse a configuration that cannot build a tab", () => {
    expect(() =>
      deriveTemplateFromSilhouette({
        silhouette: square,
        depth,
        configuration: { minimumTabLength: 50, tabLength: 30 },
      }),
    ).toThrow(InvalidTemplateConfigurationError);
  });

  it("should derive the same template from the same silhouette", () => {
    expect(
      deriveTemplateFromSilhouette({ silhouette: square, depth }),
    ).toEqual(deriveTemplateFromSilhouette({ silhouette: square, depth }));
  });

  it("should start every piece at the origin", () => {
    const template = deriveTemplateFromSilhouette({ silhouette: square, depth });

    for (const piece of template.pieces) {
      const bounds = templateGeometryBounds(piece.geometry);

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
    }
  });
});

describe("Silhouette measurement", () => {
  it("should measure the perimeter of a closed contour", () => {
    expect(polygonPerimeter(square)).toBe(1600);
  });

  it("should measure a figure by its outline, not its canvas", () => {
    const bounds = polygonBounds(square);

    expect(boundingBoxDimensions(bounds)).toEqual({ width: 400, height: 400 });
  });
});
