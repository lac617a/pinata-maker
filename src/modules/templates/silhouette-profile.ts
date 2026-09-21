import { distanceBetween, type Point } from "@/modules/geometry/point";
import { type Polygon, polygonPerimeter } from "@/modules/geometry/polygon";
import {
  type Degrees,
  type Millimeters,
  radiansToDegrees,
} from "@/modules/geometry/units";

import { UnsupportedSilhouetteError } from "./errors";

/**
 * Medida de un vértice de la silueta a lo largo de su perímetro.
 *
 * La tira lateral se construye recorriendo la silueta, así que cada vértice
 * necesita saber a qué distancia del inicio está y cuánto tuerce la figura
 * ahí. Ver docs/template.md §113.
 */
export type SilhouetteVertex = {
  readonly point: Point;
  /** Distancia recorrida desde el primer vértice. */
  readonly arcPosition: Millimeters;
  /** Cuánto cambia de dirección el recorrido en este vértice. */
  readonly turnAngle: Degrees;
  /**
   * Radio del círculo que pasa por este vértice y sus dos vecinos.
   *
   * `Infinity` cuando los tres están alineados: una recta no curva.
   */
  readonly curvatureRadius: Millimeters;
};

export type SilhouetteProfile = {
  readonly perimeter: Millimeters;
  readonly vertices: readonly SilhouetteVertex[];
  /** Distancia acumulada al final de cada segmento, para buscar por arco. */
  readonly arcEnds: readonly Millimeters[];
};

/**
 * Mide la silueta a lo largo de su perímetro.
 *
 * Se calcula una sola vez y se consulta después: el reparto de la tira y la
 * distribución de pestañas necesitan los mismos datos, y recalcularlos daría
 * resultados distintos por redondeo.
 */
export function profileSilhouette(silhouette: Polygon): SilhouetteProfile {
  if (!silhouette.closed) {
    throw new UnsupportedSilhouetteError(
      "A silhouette must be a closed contour to be extruded.",
    );
  }

  const points = silhouette.points;
  const perimeter = polygonPerimeter(silhouette);

  if (perimeter <= 0) {
    throw new UnsupportedSilhouetteError(
      "A silhouette with no perimeter cannot produce a side strip.",
    );
  }

  const vertices: SilhouetteVertex[] = [];
  const arcEnds: Millimeters[] = [];

  let travelled = 0;

  for (let index = 0; index < points.length; index++) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];

    vertices.push({
      point: current,
      arcPosition: travelled,
      turnAngle: turnAngleAt(previous, current, next),
      curvatureRadius: curvatureRadiusAtVertex(previous, current, next),
    });

    travelled += distanceBetween(current, next);
    arcEnds.push(travelled);
  }

  return { perimeter, vertices, arcEnds };
}

/**
 * Radio de curvatura en una posición del recorrido.
 *
 * Lo usa la distribución de pestañas: cuanto menor es el radio, más corta
 * debe ser la pestaña para no despegarse. Ver docs/template.md §116.
 *
 * Se devuelve el radio más cerrado de los dos extremos del segmento que
 * contiene la posición, porque una pestaña que lo cruza debe poder con el
 * peor de los dos.
 */
export function curvatureRadiusAt(
  profile: SilhouetteProfile,
  arcPosition: Millimeters,
): Millimeters {
  const index = segmentIndexAt(profile, arcPosition);
  const next = (index + 1) % profile.vertices.length;

  return Math.min(
    profile.vertices[index].curvatureRadius,
    profile.vertices[next].curvatureRadius,
  );
}

/**
 * Segmento del recorrido que contiene una posición de arco.
 *
 * Búsqueda binaria: el reparto de pestañas consulta muchas veces un perfil
 * que puede tener miles de vértices.
 */
function segmentIndexAt(
  profile: SilhouetteProfile,
  arcPosition: Millimeters,
): number {
  const wrapped = wrapArcPosition(arcPosition, profile.perimeter);

  let low = 0;
  let high = profile.arcEnds.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (profile.arcEnds[middle] <= wrapped) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

/** El recorrido es un anillo: pasado el perímetro se vuelve al principio. */
function wrapArcPosition(
  arcPosition: Millimeters,
  perimeter: Millimeters,
): Millimeters {
  const wrapped = arcPosition % perimeter;

  return wrapped < 0 ? wrapped + perimeter : wrapped;
}

/**
 * Cambio de dirección del recorrido, entre 0° y 180°.
 *
 * No distingue si la figura gira hacia dentro o hacia fuera: la tira se
 * quiebra igual en una esquina entrante que en una saliente.
 */
function turnAngleAt(previous: Point, current: Point, next: Point): Degrees {
  const incoming = { x: current.x - previous.x, y: current.y - previous.y };
  const outgoing = { x: next.x - current.x, y: next.y - current.y };

  const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
  const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;

  if (cross === 0 && dot === 0) {
    return 0;
  }

  return Math.abs(radiansToDegrees(Math.atan2(cross, dot)));
}

/**
 * Radio del círculo que pasa por los tres puntos.
 *
 * Es la estimación estándar de curvatura sobre un contorno discreto: el
 * circunradio del triángulo que forman el vértice y sus vecinos.
 */
function curvatureRadiusAtVertex(
  previous: Point,
  current: Point,
  next: Point,
): Millimeters {
  const a = distanceBetween(previous, current);
  const b = distanceBetween(current, next);
  const c = distanceBetween(previous, next);

  const cross =
    (current.x - previous.x) * (next.y - current.y) -
    (current.y - previous.y) * (next.x - current.x);

  // Tres puntos alineados no definen un círculo: la recta es el límite, de
  // radio infinito.
  if (cross === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (a * b * c) / (2 * Math.abs(cross));
}
