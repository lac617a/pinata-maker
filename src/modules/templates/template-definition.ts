import { InvalidGeometryError } from "../geometry/errors";
import { createPolygon, type Polygon } from "../geometry/polygon";
import type { Point } from "../geometry/point";
import {
  createTemplateGeometry,
  type TemplateGeometry,
} from "../geometry/template-geometry";
import { InvalidTemplateDefinitionError } from "./errors";
import type { PieceRole, Template, TemplatePiece } from "./template";

/**
 * Versión del formato con el que se guarda una plantilla.
 *
 * Existe para poder migrar lo ya guardado cuando el formato cambie: sin ella,
 * una plantilla antigua se leería mal en silencio. Ver docs/storage.md §33 y
 * §34.
 */
export const TEMPLATE_SCHEMA_VERSION = 1;

/**
 * Un polígono guardado.
 *
 * Los puntos van como pares `[x, y]` y no como objetos `{ x, y }`: una
 * plantilla real tiene miles de puntos, y repetir los nombres de los campos
 * en cada uno multiplica el tamaño del documento sin aportar nada.
 */
export type PolygonDefinition = {
  readonly points: readonly (readonly [number, number])[];
  readonly closed: boolean;
};

export type TemplateGeometryDefinition = {
  readonly outerContours: readonly PolygonDefinition[];
  readonly holes: readonly PolygonDefinition[];
  readonly cutLines: readonly PolygonDefinition[];
  readonly foldLines: readonly PolygonDefinition[];
};

export type TemplatePieceDefinition = {
  readonly id: string;
  readonly role: PieceRole;
  readonly geometry: TemplateGeometryDefinition;
};

/**
 * Plantilla en la forma en la que se persiste.
 *
 * No es la entidad del dominio: es su representación, y son modelos distintos
 * a propósito. Ver docs/storage.md §31.
 *
 * Las medidas siguen siendo milímetros: guardar no introduce otra unidad.
 */
export type TemplateDefinition = {
  readonly schemaVersion: number;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly derivationVersion: string;
  readonly pieces: readonly TemplatePieceDefinition[];
};

/**
 * Techos del documento guardado.
 *
 * Una plantilla de un metro ronda las veinte piezas y unos pocos miles de
 * puntos. Estos límites dejan margen de sobra y evitan que un documento
 * degenerado llene la base de datos. Ver docs/storage.md §45 y §112.
 */
export const TEMPLATE_DEFINITION_LIMITS = {
  maxPieces: 200,
  maxPoints: 200_000,
  maxNameLength: 120,
  maxIdentifierLength: 64,
} as const;

const PIECE_ROLES: readonly PieceRole[] = ["FRONT", "BACK", "SIDE"];

/** Plantilla del dominio a documento guardable. */
export function serializeTemplate(template: Template): TemplateDefinition {
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    name: template.name,
    width: template.width,
    height: template.height,
    depth: template.depth,
    derivationVersion: template.derivationVersion,
    pieces: template.pieces.map((piece) => ({
      id: piece.id,
      role: piece.role,
      geometry: {
        outerContours: piece.geometry.outerContours.map(toPolygonDefinition),
        holes: piece.geometry.holes.map(toPolygonDefinition),
        cutLines: piece.geometry.cutLines.map((line) =>
          toPolygonDefinition(line.geometry),
        ),
        foldLines: piece.geometry.foldLines.map((line) =>
          toPolygonDefinition(line.geometry),
        ),
      },
    })),
  };
}

/**
 * Documento guardado a plantilla del dominio.
 *
 * Reconstruye con los constructores del dominio y nunca con un `as Template`.
 * Lo que vuelve de la base de datos o de una petición no merece confianza por
 * tener la forma correcta: un contorno abierto o una coordenada infinita
 * deben fallar aquí y no al imprimir.
 */
export function deserializeTemplate(value: unknown): Template {
  const definition = asObject(value, "template definition");
  const schemaVersion = asNumber(definition.schemaVersion, "schemaVersion");

  if (schemaVersion !== TEMPLATE_SCHEMA_VERSION) {
    throw new InvalidTemplateDefinitionError(
      `This build reads template schema ${TEMPLATE_SCHEMA_VERSION}, the document declares ${schemaVersion}.`,
    );
  }

  const pieces = asArray(definition.pieces, "pieces");

  if (pieces.length === 0) {
    throw new InvalidTemplateDefinitionError(
      "A template needs at least one piece.",
    );
  }

  if (pieces.length > TEMPLATE_DEFINITION_LIMITS.maxPieces) {
    throw new InvalidTemplateDefinitionError(
      `A template supports at most ${TEMPLATE_DEFINITION_LIMITS.maxPieces} pieces, the document declares ${pieces.length}.`,
    );
  }

  let points = 0;

  const countPoints = (added: number): void => {
    points += added;

    if (points > TEMPLATE_DEFINITION_LIMITS.maxPoints) {
      throw new InvalidTemplateDefinitionError(
        `A template supports at most ${TEMPLATE_DEFINITION_LIMITS.maxPoints} points.`,
      );
    }
  };

  return {
    name: asText(
      definition.name,
      "name",
      TEMPLATE_DEFINITION_LIMITS.maxNameLength,
    ),
    width: asPositive(definition.width, "width"),
    height: asPositive(definition.height, "height"),
    depth: asPositive(definition.depth, "depth"),
    derivationVersion: asText(
      definition.derivationVersion,
      "derivationVersion",
      TEMPLATE_DEFINITION_LIMITS.maxIdentifierLength,
    ),
    pieces: pieces.map((piece) => toPiece(piece, countPoints)),
  };
}

function toPolygonDefinition(polygon: Polygon): PolygonDefinition {
  return {
    points: polygon.points.map((point) => [point.x, point.y] as const),
    closed: polygon.closed,
  };
}

function toPiece(
  value: unknown,
  countPoints: (added: number) => void,
): TemplatePiece {
  const piece = asObject(value, "piece");
  const role = asText(
    piece.role,
    "role",
    TEMPLATE_DEFINITION_LIMITS.maxIdentifierLength,
  );

  if (!PIECE_ROLES.includes(role as PieceRole)) {
    throw new InvalidTemplateDefinitionError(
      `A piece role must be one of ${PIECE_ROLES.join(", ")}, received ${role}.`,
    );
  }

  return {
    id: asText(
      piece.id,
      "piece id",
      TEMPLATE_DEFINITION_LIMITS.maxIdentifierLength,
    ),
    role: role as PieceRole,
    geometry: toGeometry(piece.geometry, countPoints),
  };
}

function toGeometry(
  value: unknown,
  countPoints: (added: number) => void,
): TemplateGeometry {
  const geometry = asObject(value, "piece geometry");

  const polygons = (field: unknown, name: string): Polygon[] =>
    asArray(field ?? [], name).map((polygon) =>
      toPolygon(polygon, name, countPoints),
    );

  return fromDomain(() =>
    createTemplateGeometry({
      outerContours: polygons(geometry.outerContours, "outerContours"),
      holes: polygons(geometry.holes, "holes"),
      cutLines: polygons(geometry.cutLines, "cutLines").map((polygon) => ({
        geometry: polygon,
      })),
      foldLines: polygons(geometry.foldLines, "foldLines").map((polygon) => ({
        geometry: polygon,
      })),
    }),
  );
}

/**
 * Un documento inválido es un documento inválido, venga de donde venga.
 *
 * Los constructores del dominio rechazan con `InvalidGeometryError`, que
 * describe un fallo de geometría. Aquí el fallo es del documento que se
 * intentó leer, y quien lo recibe —una ruta HTTP— necesita poder decir eso y
 * no «algo salió mal». Ver docs/PRD.md §23.
 */
function fromDomain<T>(build: () => T): T {
  try {
    return build();
  } catch (error) {
    if (error instanceof InvalidGeometryError) {
      throw new InvalidTemplateDefinitionError(error.message);
    }

    throw error;
  }
}

function toPolygon(
  value: unknown,
  field: string,
  countPoints: (added: number) => void,
): Polygon {
  const polygon = asObject(value, field);
  const points = asArray(polygon.points, `${field}.points`);

  countPoints(points.length);

  if (typeof polygon.closed !== "boolean") {
    // El cierre es explícito también al guardarlo: deducirlo de que el primer
    // punto coincida con el último sería fiarse de una coincidencia.
    // Ver docs/geometry.md §16.
    throw new InvalidTemplateDefinitionError(
      `${field} must declare whether it is closed.`,
    );
  }

  const closed = polygon.closed;

  return fromDomain(() =>
    createPolygon(
      points.map((point) => toPoint(point, field)),
      closed,
    ),
  );
}

function toPoint(value: unknown, field: string): Point {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new InvalidTemplateDefinitionError(
      `A point of ${field} must be a pair of coordinates.`,
    );
  }

  return {
    x: asNumber(value[0], `${field} x`),
    y: asNumber(value[1], `${field} y`),
  };
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidTemplateDefinitionError(`${field} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidTemplateDefinitionError(`${field} must be a list.`);
  }

  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidTemplateDefinitionError(
      `${field} must be a finite number.`,
    );
  }

  return value;
}

function asPositive(value: unknown, field: string): number {
  const number = asNumber(value, field);

  if (number <= 0) {
    throw new InvalidTemplateDefinitionError(
      `${field} must be greater than zero, received ${number}.`,
    );
  }

  return number;
}

function asText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidTemplateDefinitionError(`${field} must be a text value.`);
  }

  if (value.length > maxLength) {
    throw new InvalidTemplateDefinitionError(
      `${field} cannot exceed ${maxLength} characters.`,
    );
  }

  return value;
}
