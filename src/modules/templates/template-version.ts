import type { AssetId } from "@/modules/assets/asset";
import type { ProjectId } from "@/modules/projects/project";

import { InvalidTemplateDefinitionError } from "./errors";
import type { Template } from "./template";
import {
  serializeTemplate,
  type TemplateDefinition,
} from "./template-definition";

/**
 * Identidad de una versión publicada.
 *
 * `storage.md` §19 pide que sea distinta de `TemplateId`. Aquí no hay
 * `TemplateId`: la plantilla de un proyecto es la serie de sus versiones, y
 * una tabla intermedia que solo guardara un identificador y el proyecto sería
 * una capa sin contenido (`AGENTS.md` §7). Si algún día una plantilla se
 * comparte entre proyectos, esa tabla tendrá algo que decir y se añadirá
 * entonces. Ver docs/storage.md §153.
 */
export type TemplateVersionId = string;

/** La primera versión de un proyecto. Se cuenta desde uno, no desde cero. */
export const FIRST_VERSION_NUMBER = 1;

/**
 * Lo que identifica una versión sin traer su geometría.
 *
 * El panel de proyectos lista versiones; la definición de cada una pesa
 * cientos de kilobytes y no se necesita para enseñar una lista. Por eso las
 * consultas de listado devuelven esto y no la versión entera.
 */
export type TemplateVersionSummary = {
  readonly id: TemplateVersionId;
  readonly projectId: ProjectId;
  /** Correlativo dentro del proyecto: v1, v2, v3. Ver docs/storage.md §16. */
  readonly versionNumber: number;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly pieceCount: number;
  /** Con qué reglas se derivó. Ver docs/template.md §94. */
  readonly derivationVersion: string;
  /** Con qué formato se guardó. Ver docs/storage.md §33. */
  readonly schemaVersion: number;
  /**
   * Imagen de la que salió, cuando se sabe.
   *
   * Es lo que permite reproducir el contexto de una versión antigua
   * (docs/storage.md §48 y §54). Hoy puede faltar: la cadena de imagen real a
   * máscara todavía no existe.
   */
  readonly sourceAssetId: AssetId | null;
  readonly createdAt: Date;
};

/**
 * Una plantilla publicada.
 *
 * **Es inmutable.** No hay ninguna función que devuelva una versión
 * modificada, y el repositorio solo sabe crearlas: cambiar una plantilla
 * produce la versión siguiente, nunca una edición de la anterior
 * (`AGENTS.md` §17, docs/storage.md §17).
 *
 * Esa inmutabilidad no es una preferencia de diseño. Un PDF ya generado
 * apunta a la versión con la que se hizo; si la versión pudiera cambiar, el
 * documento que el usuario tiene impreso dejaría de corresponderse con lo que
 * el sistema dice que imprimió (docs/storage.md §55).
 */
export type TemplateVersion = TemplateVersionSummary & {
  readonly definition: TemplateDefinition;
};

export type CreateTemplateVersionInput = {
  readonly id: TemplateVersionId;
  readonly projectId: ProjectId;
  readonly versionNumber: number;
  readonly template: Template;
  readonly sourceAssetId?: AssetId | null;
  readonly now: Date;
};

export function createTemplateVersion(
  input: CreateTemplateVersionInput,
): TemplateVersion {
  if (input.id.trim().length === 0 || input.projectId.trim().length === 0) {
    throw new InvalidTemplateDefinitionError(
      "A template version needs an id and a project.",
    );
  }

  if (
    !Number.isInteger(input.versionNumber) ||
    input.versionNumber < FIRST_VERSION_NUMBER
  ) {
    throw new InvalidTemplateDefinitionError(
      `A version number must be an integer from ${FIRST_VERSION_NUMBER}, received ${input.versionNumber}.`,
    );
  }

  if (Number.isNaN(input.now.getTime())) {
    throw new InvalidTemplateDefinitionError("now must be a valid date.");
  }

  const definition = serializeTemplate(input.template);

  return {
    id: input.id,
    projectId: input.projectId,
    versionNumber: input.versionNumber,
    name: definition.name,
    width: definition.width,
    height: definition.height,
    depth: definition.depth,
    pieceCount: definition.pieces.length,
    derivationVersion: definition.derivationVersion,
    schemaVersion: definition.schemaVersion,
    sourceAssetId: input.sourceAssetId ?? null,
    definition,
    createdAt: input.now,
  };
}

/**
 * Qué número le toca a la siguiente versión.
 *
 * La numeración la decide el dominio y no la base de datos: un `serial` daría
 * números globales, y lo que el usuario ve es «la v3 **de este proyecto**».
 */
export function nextVersionNumber(
  latest: TemplateVersionSummary | null,
): number {
  return latest ? latest.versionNumber + 1 : FIRST_VERSION_NUMBER;
}

/** La versión sin su geometría, que es lo que viaja en un listado. */
export function summarizeTemplateVersion(
  version: TemplateVersion,
): TemplateVersionSummary {
  const { definition: _definition, ...summary } = version;

  return summary;
}
