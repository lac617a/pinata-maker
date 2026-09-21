import { describe, expect, it } from "vitest";

import { createProject, type UserId } from "@/modules/projects/project";
import type { ProjectRepository } from "@/modules/projects/project-repository";

import { createProjectExport, type ProjectExport } from "./export";
import type { ExportRepository } from "./export-repository";

/**
 * Qué significa cumplir el contrato del repositorio de exports.
 *
 * Se ejecuta contra cada implementación, de modo que «funciona» quiere decir
 * lo mismo en memoria y contra la base de datos. Ver docs/AGENTS.md §27.
 */
export type ExportRepositorySetup = {
  readonly exports: ExportRepository;
  readonly projects: ProjectRepository;
};

export function describeExportRepository(
  implementation: string,
  createRepository: () =>
    Promise<ExportRepositorySetup> | ExportRepositorySetup,
): void {
  const owner: UserId = "11111111-1111-1111-1111-111111111111";
  const stranger: UserId = "22222222-2222-2222-2222-222222222222";

  async function setup() {
    const { exports, projects } = await createRepository();

    const project = createProject({
      id: crypto.randomUUID(),
      ownerId: owner,
      name: "Elefante",
      now: new Date("2026-01-01T10:00:00Z"),
    });

    await projects.save(project);

    return { exports, projects, project };
  }

  const generated = (
    projectId: string,
    at: string,
    fileName = "elefante.pdf",
  ): ProjectExport =>
    createProjectExport({
      id: crypto.randomUUID(),
      projectId,
      templateVersionId: crypto.randomUUID(),
      fileName,
      contentType: "application/pdf",
      pageCount: 48,
      byteSize: 1024,
      paperFormat: "A4",
      paperOrientation: "PORTRAIT",
      generatorVersion: "1.0",
      now: new Date(at),
    });

  describe(`Export repository (${implementation})`, () => {
    it("should return a generated export to the owner of its project", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);

      expect(await exports.findById(saved.id, owner)).toMatchObject({
        id: saved.id,
        fileName: "elefante.pdf",
        pageCount: 48,
        paperFormat: "A4",
      });
    });

    it("should remember which template version it came from", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);

      // Sin esto, un PDF impreso no se puede relacionar con el molde que
      // dice representar. Ver docs/storage.md §53 y §54.
      expect((await exports.findById(saved.id, owner))?.templateVersionId).toBe(
        saved.templateVersionId,
      );
    });

    it("should hide an export from anyone but the owner of its project", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);

      expect(await exports.findById(saved.id, stranger)).toBeNull();
    });

    it("should report an export that was never generated as missing", async () => {
      const { exports } = await setup();

      expect(await exports.findById(crypto.randomUUID(), owner)).toBeNull();
    });

    it("should refuse to store an export in a project of somebody else", async () => {
      const { exports, project } = await setup();

      await exports.create(
        generated(project.id, "2026-01-02T10:00:00Z"),
        stranger,
      );

      expect(await exports.listByProject(project.id, owner)).toHaveLength(0);
    });

    it("should list the most recent export first", async () => {
      const { exports, project } = await setup();

      await exports.create(
        generated(project.id, "2026-01-02T10:00:00Z", "viejo.pdf"),
        owner,
      );
      await exports.create(
        generated(project.id, "2026-03-02T10:00:00Z", "nuevo.pdf"),
        owner,
      );

      expect(
        (await exports.listByProject(project.id, owner)).map(
          (found) => found.fileName,
        ),
      ).toEqual(["nuevo.pdf", "viejo.pdf"]);
    });

    it("should keep an earlier export when a new one is generated", async () => {
      const { exports, project } = await setup();
      const first = generated(project.id, "2026-01-02T10:00:00Z", "v1.pdf");

      await exports.create(first, owner);
      await exports.create(
        generated(project.id, "2026-03-02T10:00:00Z", "v2.pdf"),
        owner,
      );

      // Un artefacto generado es inmutable: el archivo que el usuario ya
      // descargó sigue existiendo tal cual. Ver docs/storage.md §55.
      expect(await exports.findById(first.id, owner)).toMatchObject({
        fileName: "v1.pdf",
      });
    });

    it("should delete an export of the owner", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);
      await exports.delete(saved.id, owner);

      expect(await exports.findById(saved.id, owner)).toBeNull();
    });

    it("should not delete an export of somebody else", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);
      await exports.delete(saved.id, stranger);

      expect(await exports.findById(saved.id, owner)).not.toBeNull();
    });

    it("should keep the date it was given", async () => {
      const { exports, project } = await setup();
      const saved = generated(project.id, "2026-01-02T10:00:00Z");

      await exports.create(saved, owner);

      expect(
        (await exports.findById(saved.id, owner))?.createdAt.toISOString(),
      ).toBe(saved.createdAt.toISOString());
    });
  });
}
