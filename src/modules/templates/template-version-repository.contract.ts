import { describe, expect, it } from "vitest";

import { createPolygon } from "@/modules/geometry/polygon";
import { createTemplateGeometry } from "@/modules/geometry/template-geometry";
import { createProject, type UserId } from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

import { TemplateVersionConflictError } from "./errors";
import { type Template, TEMPLATE_DERIVATION_VERSION } from "./template";
import { createTemplateVersion } from "./template-version";
import type { TemplateVersionRepository } from "./template-version-repository";

/**
 * Qué significa cumplir el contrato del repositorio de versiones.
 *
 * Se ejecuta contra cada implementación, de modo que «funciona» quiere decir
 * lo mismo en memoria y contra la base de datos. Ver docs/AGENTS.md §27.
 *
 * Lo que más importa aquí no es leer y escribir: es que **no se pueda
 * sobrescribir una versión publicada**.
 */
export type TemplateVersionRepositorySetup = {
  readonly versions: TemplateVersionRepository;
  readonly projects: ProjectRepository;
};

/** Plantilla mínima pero real: una pieza cuadrada con su doblez. */
export function squareTemplate(name = "Cuadrado"): Template {
  const square = createPolygon(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    true,
  );

  const fold = createPolygon(
    [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ],
    false,
  );

  return {
    name,
    width: 100,
    height: 100,
    depth: 20,
    derivationVersion: TEMPLATE_DERIVATION_VERSION,
    pieces: [
      {
        id: "FRONT-1",
        role: "FRONT",
        geometry: createTemplateGeometry({
          outerContours: [square],
          foldLines: [{ geometry: fold }],
        }),
      },
    ],
  };
}

export function describeTemplateVersionRepository(
  implementation: string,
  createRepository: () =>
    Promise<TemplateVersionRepositorySetup> | TemplateVersionRepositorySetup,
): void {
  const owner: UserId = "11111111-1111-1111-1111-111111111111";
  const stranger: UserId = "22222222-2222-2222-2222-222222222222";

  async function setup(ownerId: UserId = owner) {
    const { versions, projects } = await createRepository();

    const project = createProject({
      id: crypto.randomUUID(),
      ownerId,
      name: "Elefante",
      now: new Date("2026-01-01T10:00:00Z"),
    });

    await projects.save(project);

    return { versions, projects, project };
  }

  const version = (
    projectId: string,
    versionNumber: number,
    name = "Elefante",
  ) =>
    createTemplateVersion({
      id: crypto.randomUUID(),
      projectId,
      versionNumber,
      template: squareTemplate(name),
      now: new Date("2026-01-02T10:00:00Z"),
    });

  describe(`Template version repository (${implementation})`, () => {
    it("should return a published version to the owner of its project", async () => {
      const { versions, project } = await setup();
      const published = version(project.id, 1);

      await versions.create(published, owner);

      expect(await versions.findById(published.id, owner)).toMatchObject({
        id: published.id,
        versionNumber: 1,
        pieceCount: 1,
      });
    });

    it("should keep the geometry it was given", async () => {
      const { versions, project } = await setup();
      const published = version(project.id, 1);

      await versions.create(published, owner);

      const found = await versions.findById(published.id, owner);

      // Una plantilla que vuelve distinta de como se guardó no sirve para
      // reimprimir lo que el usuario ya recortó.
      expect(found?.definition).toEqual(published.definition);
    });

    it("should hide a version from anyone but the owner of its project", async () => {
      const { versions, project } = await setup();
      const published = version(project.id, 1);

      await versions.create(published, owner);

      expect(await versions.findById(published.id, stranger)).toBeNull();
    });

    it("should refuse to publish a second version with the same number", async () => {
      const { versions, project } = await setup();

      await versions.create(version(project.id, 1, "Primera"), owner);

      // Inmutabilidad: publicar encima no sustituye, falla.
      await expect(
        versions.create(version(project.id, 1, "Segunda"), owner),
      ).rejects.toBeInstanceOf(TemplateVersionConflictError);

      const found = await versions.findLatest(project.id, owner);

      expect(found?.name).toBe("Primera");
    });

    it("should list the most recent version first", async () => {
      const { versions, project } = await setup();

      await versions.create(version(project.id, 1, "v1"), owner);
      await versions.create(version(project.id, 2, "v2"), owner);

      expect(
        (await versions.listByProject(project.id, owner)).map(
          (found) => found.versionNumber,
        ),
      ).toEqual([2, 1]);
    });

    it("should not carry the geometry in a listing", async () => {
      const { versions, project } = await setup();

      await versions.create(version(project.id, 1), owner);

      const [listed] = await versions.listByProject(project.id, owner);

      expect(listed).not.toHaveProperty("definition");
      expect(listed.pieceCount).toBe(1);
    });

    it("should report the latest version of the project", async () => {
      const { versions, project } = await setup();

      await versions.create(version(project.id, 1, "v1"), owner);
      await versions.create(version(project.id, 2, "v2"), owner);

      expect((await versions.findLatest(project.id, owner))?.name).toBe("v2");
    });

    it("should report no latest version for a project without any", async () => {
      const { versions, project } = await setup();

      expect(await versions.findLatest(project.id, owner)).toBeNull();
    });

    it("should not list the versions of a project of somebody else", async () => {
      const { versions, project } = await setup();

      await versions.create(version(project.id, 1), owner);

      expect(await versions.listByProject(project.id, stranger)).toHaveLength(
        0,
      );
    });

    it("should keep the date it was given", async () => {
      const { versions, project } = await setup();
      const published = version(project.id, 1);

      await versions.create(published, owner);

      expect(
        (await versions.findById(published.id, owner))?.createdAt.toISOString(),
      ).toBe(published.createdAt.toISOString());
    });
  });
}
