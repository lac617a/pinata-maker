import type { Millimeters } from "../geometry/units";
import { curvatureRadiusAt, type SilhouetteProfile } from "./silhouette-profile";

/**
 * Configuración física de las pestañas.
 *
 * Vive en un único sitio para que cambiar el aspecto de una pestaña no exija
 * tocar varios algoritmos. Ver docs/template.md §26, §31 y §118.
 */
export type TabConfiguration = {
  /** Cuánto monta la pestaña sobre la cara a la que se pega. */
  readonly tabWidth: Millimeters;
  /** Longitud nominal a lo largo del borde, en un tramo recto. */
  readonly tabLength: Millimeters;
  readonly tabSpacing: Millimeters;
  /** Separación admisible entre una pestaña recta y la curva que sigue. */
  readonly tabFlatnessTolerance: Millimeters;
  /** Por debajo de esta longitud una pestaña no se puede pegar. */
  readonly minimumTabLength: Millimeters;
  /** Tramo por debajo del cual no se genera ninguna pestaña. */
  readonly minimumTabSegment: Millimeters;
};

/**
 * Trozo de borde que se pliega y se pega.
 *
 * Las posiciones son de arco sobre el perímetro de la silueta, no coordenadas:
 * la pestaña existe antes de saber en qué pieza lateral va a caer.
 */
export type Tab = {
  readonly start: Millimeters;
  readonly end: Millimeters;
};

/**
 * Longitud máxima que puede tener una pestaña recta sobre una curva.
 *
 * Una cuerda de longitud `L` sobre un círculo de radio `r` se separa del arco
 * como máximo `L² / (8r)`. Despejando `L` para una separación admisible sale
 * el límite: cuanto más cerrada la curva, más corta la pestaña.
 * Ver docs/template.md §116.
 */
export function maximumTabLength(
  curvatureRadius: Millimeters,
  flatnessTolerance: Millimeters,
): Millimeters {
  if (!Number.isFinite(curvatureRadius)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.sqrt(8 * curvatureRadius * flatnessTolerance);
}

export type TabDistribution = {
  readonly from: Millimeters;
  readonly to: Millimeters;
  readonly profile: SilhouetteProfile;
  readonly configuration: TabConfiguration;
};

/**
 * Reparte pestañas a lo largo de un tramo del perímetro.
 *
 * La longitud de cada pestaña se decide en su posición, no una vez para todo
 * el tramo: un tramo puede empezar recto y terminar en una curva cerrada, y
 * usar la curvatura más cerrada para todo desperdiciaría la parte recta.
 *
 * Las pestañas se separan de los extremos del tramo, que son o el borde de la
 * pieza o una línea de doblez: una pestaña pegada al pliegue no se puede
 * plegar con limpieza. Ver docs/template.md §117.
 */
export function distributeTabs(distribution: TabDistribution): Tab[] {
  const { from, to, profile, configuration } = distribution;
  const available = to - from;

  // Un tramo demasiado corto se queda sin pestaña propia en lugar de recibir
  // una deformada. Ver docs/template.md §117 y docs/template.md §32.
  if (available < configuration.minimumTabSegment) {
    return [];
  }

  const margin = configuration.tabSpacing / 2;
  const start = from + margin;
  const end = to - margin;

  const tabs: Tab[] = [];

  let cursor = start;

  while (cursor < end) {
    const length = tabLengthAt(cursor, profile, configuration);

    if (cursor + length > end) {
      break;
    }

    tabs.push({ start: cursor, end: cursor + length });
    cursor += length + configuration.tabSpacing;
  }

  return tabs;
}

function tabLengthAt(
  arcPosition: Millimeters,
  profile: SilhouetteProfile,
  configuration: TabConfiguration,
): Millimeters {
  const allowed = maximumTabLength(
    curvatureRadiusAt(profile, arcPosition),
    configuration.tabFlatnessTolerance,
  );

  // El mínimo evita que una curvatura muy cerrada genere pestañas de dos
  // milímetros, que no hay forma de pegar. Ver docs/template.md §118.
  return Math.max(
    configuration.minimumTabLength,
    Math.min(configuration.tabLength, allowed),
  );
}
