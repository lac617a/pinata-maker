import { boundingBoxDimensions } from "../geometry/bounding-box";
import { createPoint, type Point } from "../geometry/point";
import {
  createPolygon,
  polygonBounds,
  translatePolygon,
  type Polygon,
} from "../geometry/polygon";
import {
  createTemplateGeometry,
  type FoldLine,
  type TemplateGeometry,
} from "../geometry/template-geometry";
import {
  isFiniteMillimeters,
  type Degrees,
  type Millimeters,
} from "../geometry/units";
import {
  InvalidTemplateConfigurationError,
  UnsupportedSilhouetteError,
} from "./errors";
import { profileSilhouette, type SilhouetteProfile } from "./silhouette-profile";
import { distributeTabs, type Tab, type TabConfiguration } from "./tabs";
import {
  TEMPLATE_DERIVATION_VERSION,
  type Template,
  type TemplatePiece,
} from "./template";

/**
 * Parámetros de la extrusión perimetral.
 *
 * Ver docs/template.md §118. Los valores por defecto son un punto de partida
 * razonado, no medido: se ajustarán cuando haya moldes impresos y montados.
 */
export type ExtrusionConfiguration = TabConfiguration & {
  /** Giro a partir del cual la tira recibe una línea de doblez transversal. */
  readonly foldAngleThreshold: Degrees;
  /**
   * Longitud máxima del cuerpo de una pieza lateral.
   *
   * La pieza impresa mide esto **más `tabWidth`**, porque la pestaña de unión
   * sobresale por un extremo. Quien conozca el papel debería derivarlo del
   * área imprimible: la plantilla no conoce el formato de hoja
   * (docs/template.md §114).
   */
  readonly maxSideSegmentLength: Millimeters;
};

export const DEFAULT_EXTRUSION_CONFIGURATION: ExtrusionConfiguration = {
  tabWidth: 15,
  tabLength: 30,
  tabSpacing: 10,
  tabFlatnessTolerance: 1,
  minimumTabLength: 8,
  minimumTabSegment: 20,
  foldAngleThreshold: 20,
  // 180 + 15 mm de pestaña de unión = 195 mm, que cabe en los 200 mm
  // imprimibles de un A4 vertical con el margen recomendado. Con un valor
  // mayor cada pieza lateral se parte en dos hojas y desperdicia la segunda.
  maxSideSegmentLength: 180,
};

export type ExtrusionInput = {
  readonly silhouette: Polygon;
  /**
   * Huecos de la silueta.
   *
   * Se aceptan para poder rechazarlos: un hueco es una pared interior y
   * necesita su propia tira, que este modelo no genera. Ignorarlos produciría
   * una piñata sin el agujero que el usuario ve en su imagen.
   * Ver docs/template.md §121.
   */
  readonly holes?: readonly Polygon[];
  readonly depth: Millimeters;
  readonly name?: string;
  readonly configuration?: Partial<ExtrusionConfiguration>;
};

/**
 * Convierte una silueta y una profundidad en piezas recortables.
 *
 * El modelo es el prisma: la silueta se extruye a lo largo de la
 * profundidad. `FRONT` es la silueta, `BACK` su reflejo y `SIDE` una tira de
 * anchura igual a la profundidad y longitud igual al perímetro, repartida en
 * piezas. Ver docs/template.md §110-§122.
 */
export function deriveTemplateFromSilhouette(input: ExtrusionInput): Template {
  const configuration = {
    ...DEFAULT_EXTRUSION_CONFIGURATION,
    ...input.configuration,
  };

  assertSupported(input);
  assertValidConfiguration(configuration);

  const profile = profileSilhouette(input.silhouette);
  const silhouetteSize = boundingBoxDimensions(polygonBounds(input.silhouette));

  const folds = transverseFoldPositions(profile, configuration);
  const cuts = planSideCuts(
    profile.perimeter,
    folds,
    configuration.maxSideSegmentLength,
  );

  const sides = cuts.slice(0, -1).map((from, index) =>
    buildSidePiece({
      index,
      from,
      to: cuts[index + 1],
      folds,
      profile,
      depth: input.depth,
      configuration,
    }),
  );

  return {
    name: input.name ?? "Piñata",
    width: silhouetteSize.width,
    height: silhouetteSize.height,
    depth: input.depth,
    pieces: [
      frontPiece(input.silhouette),
      backPiece(input.silhouette),
      ...sides,
    ],
    derivationVersion: TEMPLATE_DERIVATION_VERSION,
  };
}

/**
 * Vértices en los que la tira tiene que quebrarse.
 *
 * Solo los que tuercen lo suficiente: el contorno simplificado de una elipse
 * tiene más de mil vértices, y marcar un doblez en cada uno llenaría la tira
 * de pliegues que el cartón resuelve curvándose.
 * Ver docs/template.md §113.
 */
function transverseFoldPositions(
  profile: SilhouetteProfile,
  configuration: ExtrusionConfiguration,
): Millimeters[] {
  return profile.vertices
    .filter((vertex) => vertex.turnAngle >= configuration.foldAngleThreshold)
    .map((vertex) => vertex.arcPosition)
    // La posición 0 es la costura del anillo: ahí ya hay un corte.
    .filter((position) => position > 0 && position < profile.perimeter)
    .sort((a, b) => a - b);
}

/**
 * Dónde se parte la tira.
 *
 * Se prefiere cortar en un doblez porque ahí la tira ya iba a quebrarse: la
 * unión no añade un pliegue nuevo. Entre los dobleces disponibles se elige el
 * más lejano, para gastar menos piezas. Ver docs/template.md §114.
 */
function planSideCuts(
  perimeter: Millimeters,
  folds: readonly Millimeters[],
  maxLength: Millimeters,
): Millimeters[] {
  const cuts: Millimeters[] = [0];

  let cursor = 0;

  while (perimeter - cursor > maxLength) {
    const limit = cursor + maxLength;

    const fold = folds
      .filter((position) => position > cursor && position <= limit)
      .pop();

    cursor = fold ?? limit;
    cuts.push(cursor);
  }

  cuts.push(perimeter);

  return cuts;
}

function frontPiece(silhouette: Polygon): TemplatePiece {
  return {
    id: "FRONT",
    role: "FRONT",
    geometry: createTemplateGeometry({
      outerContours: [normalize(silhouette)],
    }),
  };
}

/**
 * La cara posterior.
 *
 * Se declara reflejada aunque la silueta sea simétrica. El motivo es de
 * montaje: las dos caras se pegan mirándose, así que una se voltea, y
 * declararlo evita pegarlas en la misma orientación.
 * Ver docs/template.md §112.
 */
function backPiece(silhouette: Polygon): TemplatePiece {
  const bounds = polygonBounds(silhouette);

  const mirrored = createPolygon(
    silhouette.points
      .map((point) => createPoint(bounds.maxX + bounds.minX - point.x, point.y))
      // Reflejar invierte el sentido del recorrido; volverlo a invertir deja
      // el contorno con la misma orientación que el frontal.
      .reverse(),
    silhouette.closed,
  );

  return {
    id: "BACK",
    role: "BACK",
    geometry: createTemplateGeometry({ outerContours: [normalize(mirrored)] }),
  };
}

type SidePieceInput = {
  readonly index: number;
  readonly from: Millimeters;
  readonly to: Millimeters;
  readonly folds: readonly Millimeters[];
  readonly profile: SilhouetteProfile;
  readonly depth: Millimeters;
  readonly configuration: ExtrusionConfiguration;
};

/**
 * Una pieza de la tira lateral.
 *
 * En coordenadas locales, X avanza a lo largo del perímetro e Y cruza la
 * tira. La pieza mide `tabWidth + depth + tabWidth` de alto: el cuerpo de la
 * tira más las pestañas de los dos bordes largos.
 */
function buildSidePiece(input: SidePieceInput): TemplatePiece {
  const { index, from, to, folds, profile, depth, configuration } = input;
  const { tabWidth } = configuration;

  const length = to - from;
  const bodyTop = tabWidth;
  const bodyBottom = tabWidth + depth;

  const innerFolds = folds.filter(
    (position) => position > from && position < to,
  );

  const tabs = tabsAlong({ from, to, innerFolds, profile, configuration });
  const local = (arcPosition: Millimeters) => arcPosition - from;

  const outline = createPolygon(
    [
      createPoint(0, bodyTop),
      // Borde largo superior: se pega a FRONT.
      ...tabs.flatMap((tab) => [
        createPoint(local(tab.start), bodyTop),
        createPoint(local(tab.start), 0),
        createPoint(local(tab.end), 0),
        createPoint(local(tab.end), bodyTop),
      ]),
      createPoint(length, bodyTop),
      // Pestaña de unión con la pieza siguiente del anillo.
      createPoint(length + tabWidth, bodyTop),
      createPoint(length + tabWidth, bodyBottom),
      createPoint(length, bodyBottom),
      // Borde largo inferior, de vuelta: se pega a BACK.
      ...[...tabs].reverse().flatMap((tab) => [
        createPoint(local(tab.end), bodyBottom),
        createPoint(local(tab.end), bodyBottom + tabWidth),
        createPoint(local(tab.start), bodyBottom + tabWidth),
        createPoint(local(tab.start), bodyBottom),
      ]),
      createPoint(0, bodyBottom),
    ],
    true,
  );

  const foldLines: FoldLine[] = [
    // Cada pestaña se pliega por separado, no todas por una línea corrida.
    ...tabs.flatMap((tab) => [
      foldLine(
        createPoint(local(tab.start), bodyTop),
        createPoint(local(tab.end), bodyTop),
      ),
      foldLine(
        createPoint(local(tab.start), bodyBottom),
        createPoint(local(tab.end), bodyBottom),
      ),
    ]),
    foldLine(createPoint(length, bodyTop), createPoint(length, bodyBottom)),
    // Donde la figura tuerce, la tira se quiebra.
    ...innerFolds.map((position) =>
      foldLine(
        createPoint(local(position), bodyTop),
        createPoint(local(position), bodyBottom),
      ),
    ),
  ];

  const geometry: TemplateGeometry = createTemplateGeometry({
    outerContours: [outline],
    foldLines,
  });

  return { id: `SIDE-${index + 1}`, role: "SIDE", geometry };
}

/**
 * Pestañas de una pieza lateral.
 *
 * El tramo se parte por sus dobleces antes de repartir: una pestaña que cruza
 * un pliegue no puede plegarse en las dos direcciones a la vez.
 * Ver docs/template.md §117.
 */
function tabsAlong(input: {
  from: Millimeters;
  to: Millimeters;
  innerFolds: readonly Millimeters[];
  profile: SilhouetteProfile;
  configuration: TabConfiguration;
}): Tab[] {
  const { from, to, innerFolds, profile, configuration } = input;
  const boundaries = [from, ...innerFolds, to];

  return boundaries.slice(0, -1).flatMap((start, index) =>
    distributeTabs({
      from: start,
      to: boundaries[index + 1],
      profile,
      configuration,
    }),
  );
}

function foldLine(from: Point, to: Point): FoldLine {
  return { geometry: createPolygon([from, to], false) };
}

/** Cada pieza empieza en (0,0): dónde se imprime lo decide la impresión. */
function normalize(polygon: Polygon): Polygon {
  const bounds = polygonBounds(polygon);

  return translatePolygon(polygon, { x: -bounds.minX, y: -bounds.minY });
}

function assertSupported(input: ExtrusionInput): void {
  if (input.holes && input.holes.length > 0) {
    throw new UnsupportedSilhouetteError(
      `A silhouette with ${input.holes.length} hole(s) needs an inner wall, which the perimeter extrusion model does not produce.`,
    );
  }

  if (!isFiniteMillimeters(input.depth) || input.depth <= 0) {
    throw new UnsupportedSilhouetteError(
      `The depth must be a finite value greater than 0 mm, received ${input.depth}.`,
    );
  }
}

function assertValidConfiguration(
  configuration: ExtrusionConfiguration,
): void {
  const positive: (keyof ExtrusionConfiguration)[] = [
    "tabWidth",
    "tabLength",
    "tabSpacing",
    "tabFlatnessTolerance",
    "minimumTabLength",
    "minimumTabSegment",
    "maxSideSegmentLength",
  ];

  for (const key of positive) {
    const value = configuration[key];

    if (!isFiniteMillimeters(value) || value <= 0) {
      throw new InvalidTemplateConfigurationError(
        `${key} must be a finite value greater than 0 mm, received ${value}.`,
      );
    }
  }

  if (
    configuration.foldAngleThreshold <= 0 ||
    configuration.foldAngleThreshold >= 180
  ) {
    throw new InvalidTemplateConfigurationError(
      `foldAngleThreshold must sit between 0 and 180 degrees, received ${configuration.foldAngleThreshold}.`,
    );
  }

  if (configuration.minimumTabLength > configuration.tabLength) {
    throw new InvalidTemplateConfigurationError(
      `minimumTabLength (${configuration.minimumTabLength} mm) cannot exceed tabLength (${configuration.tabLength} mm).`,
    );
  }

}
