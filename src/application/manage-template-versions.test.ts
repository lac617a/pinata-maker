import { describe, expect, it } from "vitest";

import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import {
  TemplateVersionConflictError,
  TemplateVersionNotFoundError,
} from "@/modules/templates/errors";
import { InMemoryTemplateVersionRepository } from "@/modules/templates/in-memory-template-version-repository";
import { squareTemplate } from "@/modules/templates/template-version-repository.contract";

import { createProject } from "./manage-projects";
import {
  listTemplateVersions,
  openTemplateVersion,
  publishTemplateVersion,
  type TemplateVersionServices,
} from "./manage-template-versions";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

/** Reloj e identificadores controlados: el resultado debe ser reproducible. */
function services(): TemplateVersionServices {
  let clock = 0;
  let projectSequence = 0;
  let versionSequence = 0;

  const repository = new InMemoryProjectRepository();

  return {
    repository,
    templateVersions: new InMemoryTemplateVersionRepository(repository),
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `aaaaaaaa-0000-4000-8000-00000000000${++projectSequence}`,
    newTemplateVersionId: () =>
      `bbbbbbbb-0000-4000-8000-00000000000${++versionSequence}`,
  };
}

async function project(context: TemplateVersionServices, ownerId = owner) {
  return createProject(context, { ownerId, name: "Elefante" });
}

describe("Manage template versions", () => {
  it("should publish the first version as version one", async () => {
    const context = services();
    const owned = await project(context);

    const version = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
    });

    expect(version.versionNumber).toBe(1);
    expect(version.projectId).toBe(owned.id);
    expect(version.pieceCount).toBe(1);
  });

  it("should give the next number to each new version", async () => {
    const context = services();
    const owned = await project(context);

    for (const name of ["v1", "v2", "v3"]) {
      await publishTemplateVersion(context, {
        projectId: owned.id,
        userId: owner,
        template: squareTemplate(name),
      });
    }

    expect(
      (await listTemplateVersions(context, owned.id, owner)).map(
        (version) => version.versionNumber,
      ),
    ).toEqual([3, 2, 1]);
  });

  it("should number the versions of each project on its own", async () => {
    const context = services();
    const first = await project(context);
    const second = await project(context);

    await publishTemplateVersion(context, {
      projectId: first.id,
      userId: owner,
      template: squareTemplate(),
    });

    const version = await publishTemplateVersion(context, {
      projectId: second.id,
      userId: owner,
      template: squareTemplate(),
    });

    // Lo que el usuario lee es «la v1 de este proyecto», no un correlativo
    // global del sistema.
    expect(version.versionNumber).toBe(1);
  });

  it("should not change a published version when a new one arrives", async () => {
    const context = services();
    const owned = await project(context);

    const first = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate("Primera"),
    });

    await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate("Segunda"),
    });

    const { version, template } = await openTemplateVersion(
      context,
      first.id,
      owner,
    );

    // Es la razón de ser del versionado: el PDF que el usuario imprimió ayer
    // sigue correspondiéndose con lo que el sistema guarda. Ver §17.
    expect(version.name).toBe("Primera");
    expect(template.name).toBe("Primera");
  });

  it("should return the template that was published", async () => {
    const context = services();
    const owned = await project(context);
    const published = squareTemplate();

    const version = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: published,
    });

    const { template } = await openTemplateVersion(context, version.id, owner);

    expect(template).toEqual(published);
  });

  it("should reject a version published against an older state", async () => {
    const context = services();
    const owned = await project(context);

    await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
    });

    // Quien envía esto cree que el proyecto sigue sin versiones. Encadenar su
    // trabajo al de otro sin avisar perdería uno de los dos. Ver §21 y §22.
    await expect(
      publishTemplateVersion(context, {
        projectId: owned.id,
        userId: owner,
        template: squareTemplate(),
        expectedVersionNumber: 0,
      }),
    ).rejects.toBeInstanceOf(TemplateVersionConflictError);
  });

  it("should accept a version published against the current state", async () => {
    const context = services();
    const owned = await project(context);

    await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
    });

    const second = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
      expectedVersionNumber: 1,
    });

    expect(second.versionNumber).toBe(2);
  });

  it("should remember which image a version came from", async () => {
    const context = services();
    const owned = await project(context);

    const version = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
      sourceAssetId: "cccccccc-0000-4000-8000-000000000001",
    });

    // Sin esto no hay forma de saber de qué imagen salió una plantilla
    // antigua. Ver docs/storage.md §48 y §54.
    expect(version.sourceAssetId).toBe("cccccccc-0000-4000-8000-000000000001");
  });

  it("should not publish into a project of somebody else", async () => {
    const context = services();
    const owned = await project(context);

    await expect(
      publishTemplateVersion(context, {
        projectId: owned.id,
        userId: stranger,
        template: squareTemplate(),
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    expect(await listTemplateVersions(context, owned.id, owner)).toHaveLength(
      0,
    );
  });

  it("should not open a version of somebody else", async () => {
    const context = services();
    const owned = await project(context);

    const version = await publishTemplateVersion(context, {
      projectId: owned.id,
      userId: owner,
      template: squareTemplate(),
    });

    await expect(
      openTemplateVersion(context, version.id, stranger),
    ).rejects.toBeInstanceOf(TemplateVersionNotFoundError);
  });

  it("should answer the same for a version that never existed", async () => {
    const context = services();

    await expect(
      openTemplateVersion(
        context,
        "bbbbbbbb-0000-4000-8000-0000000000ff",
        owner,
      ),
    ).rejects.toBeInstanceOf(TemplateVersionNotFoundError);
  });

  it("should not list the versions of a project of somebody else", async () => {
    const context = services();
    const owned = await project(context);

    await expect(
      listTemplateVersions(context, owned.id, stranger),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
