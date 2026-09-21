import type { AssetId } from "../modules/assets/asset";
import type { ProjectId, UserId } from "../modules/projects/project";
import {
  TemplateVersionConflictError,
  TemplateVersionNotFoundError,
} from "../modules/templates/errors";
import type { Template } from "../modules/templates/template";
import { deserializeTemplate } from "../modules/templates/template-definition";
import {
  createTemplateVersion,
  nextVersionNumber,
  type TemplateVersion,
  type TemplateVersionId,
  type TemplateVersionSummary,
} from "../modules/templates/template-version";
import type { TemplateVersionRepository } from "../modules/templates/template-version-repository";
import { openProject, type ProjectServices } from "./manage-projects";

export type TemplateVersionServices = ProjectServices & {
  readonly templateVersions: TemplateVersionRepository;
  readonly newTemplateVersionId: () => TemplateVersionId;
};

export type PublishTemplateVersionInput = {
  readonly projectId: ProjectId;
  readonly userId: UserId;
  readonly template: Template;
  /** Imagen de la que salió, cuando se conoce. Ver docs/storage.md §48. */
  readonly sourceAssetId?: AssetId | null;
  /**
   * Última versión que conocía quien publica, o cero si ninguna.
   *
   * Es el `expectedVersion` de docs/storage.md §21: si mientras tanto alguien
   * publicó otra, esta petición se rechaza en lugar de encadenarse a un
   * estado que quien la envió no llegó a ver.
   *
   * Omitirlo significa «publica sobre lo que haya».
   */
  readonly expectedVersionNumber?: number;
};

/**
 * Publica una versión de la plantilla del proyecto.
 *
 * Publicar nunca sustituye: cada llamada crea la versión siguiente y las
 * anteriores quedan como estaban (`AGENTS.md` §17, docs/storage.md §17). Eso
 * es lo que permite que un PDF ya descargado siga correspondiéndose con la
 * plantilla con la que se hizo.
 *
 * No cambia el estado del proyecto. Llevarlo a `READY` es una transición del
 * ciclo de vida y la decide quien orquesta el procesado, no quien guarda
 * (docs/PRD.md §22).
 */
export async function publishTemplateVersion(
  services: TemplateVersionServices,
  input: PublishTemplateVersionInput,
): Promise<TemplateVersion> {
  // Si el proyecto no es suyo, no se publica nada.
  await openProject(services, input.projectId, input.userId);

  const latest = await services.templateVersions.findLatest(
    input.projectId,
    input.userId,
  );

  const latestNumber = latest?.versionNumber ?? 0;

  if (
    input.expectedVersionNumber !== undefined &&
    input.expectedVersionNumber !== latestNumber
  ) {
    throw new TemplateVersionConflictError(
      `The project is at version ${latestNumber} and the request expected ${input.expectedVersionNumber}.`,
    );
  }

  const version = createTemplateVersion({
    id: services.newTemplateVersionId(),
    projectId: input.projectId,
    versionNumber: nextVersionNumber(latest),
    template: input.template,
    sourceAssetId: input.sourceAssetId ?? null,
    now: services.now(),
  });

  // Dos publicaciones simultáneas leen el mismo `latest` y piden el mismo
  // número. La segunda choca con la restricción única y falla: no se
  // reintenta en silencio, porque quien publicó lo hizo sobre un estado que
  // ya no es el actual. Ver docs/storage.md §22.
  await services.templateVersions.create(version, input.userId);

  return version;
}

export async function listTemplateVersions(
  services: TemplateVersionServices,
  projectId: ProjectId,
  userId: UserId,
): Promise<TemplateVersionSummary[]> {
  await openProject(services, projectId, userId);

  return services.templateVersions.listByProject(projectId, userId);
}

/**
 * Recupera una versión y la plantilla que contiene.
 *
 * La definición guardada se vuelve a validar al leerla: entre que se guardó y
 * ahora puede haber cambiado el formato, y una plantilla que no cumple el
 * dominio no debe llegar a la impresión. Ver docs/storage.md §34.
 */
export async function openTemplateVersion(
  services: TemplateVersionServices,
  versionId: TemplateVersionId,
  userId: UserId,
): Promise<{ readonly version: TemplateVersion; readonly template: Template }> {
  const version = await services.templateVersions.findById(versionId, userId);

  if (!version) {
    // Igual que con proyectos: inexistente y ajena responden lo mismo.
    throw new TemplateVersionNotFoundError(
      `Template version ${versionId} is not available.`,
    );
  }

  return { version, template: deserializeTemplate(version.definition) };
}
