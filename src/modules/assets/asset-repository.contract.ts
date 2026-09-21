import { describe, expect, it } from "vitest";

import { createProject, type UserId } from "../projects/project";
import type { ProjectRepository } from "../projects/project-repository";
import { createAsset, type Asset } from "./asset";
import type { AssetRepository } from "./asset-repository";

/**
 * Qué significa cumplir el contrato del repositorio de assets.
 *
 * Mismo papel que el de proyectos: describe qué debe observarse después de
 * cada operación, sin decir cómo se guarda. Ver docs/AGENTS.md §27.
 *
 * La diferencia con proyectos es de dónde sale la propiedad. Un asset no
 * tiene dueño propio: es de quien sea su proyecto. Por eso el contrato
 * necesita también el repositorio de proyectos, y por eso se comprueba aquí
 * que un asset de un proyecto ajeno se comporta como inexistente.
 */
export type AssetRepositorySetup = {
  readonly assets: AssetRepository;
  readonly projects: ProjectRepository;
};

export function describeAssetRepository(
  implementation: string,
  createRepository: () => Promise<AssetRepositorySetup> | AssetRepositorySetup,
): void {
  const owner: UserId = "11111111-1111-1111-1111-111111111111";
  const stranger: UserId = "22222222-2222-2222-2222-222222222222";

  const createdAt = (iso: string) => new Date(iso);

  async function setup(ownerId: UserId = owner) {
    const { assets, projects } = await createRepository();

    const project = createProject({
      id: crypto.randomUUID(),
      ownerId,
      name: "Elefante",
      now: createdAt("2026-01-01T10:00:00Z"),
    });

    await projects.save(project);

    return { assets, projects, project };
  }

  const asset = (projectId: string, at: string, originalName = "foto.png"): Asset =>
    createAsset({
      id: crypto.randomUUID(),
      projectId,
      kind: "ORIGINAL_IMAGE",
      mimeType: "image/png",
      byteSize: 2048,
      originalName,
      now: createdAt(at),
    });

  describe(`Asset repository (${implementation})`, () => {
    it("should return a saved asset to the owner of its project", async () => {
      const { assets, project } = await setup();
      const saved = asset(project.id, "2026-01-02T10:00:00Z");

      await assets.save(saved, owner);

      expect(await assets.findById(saved.id, owner)).toMatchObject({
        id: saved.id,
        projectId: project.id,
        kind: "ORIGINAL_IMAGE",
        originalName: "foto.png",
      });
    });

    it("should hide an asset from anyone but the owner of its project", async () => {
      const { assets, project } = await setup();
      const saved = asset(project.id, "2026-01-02T10:00:00Z");

      await assets.save(saved, owner);

      // Igual que con proyectos: ajeno e inexistente responden lo mismo.
      expect(await assets.findById(saved.id, stranger)).toBeNull();
    });

    it("should report an asset that was never saved as missing", async () => {
      const { assets } = await setup();

      expect(await assets.findById(crypto.randomUUID(), owner)).toBeNull();
    });

    it("should refuse to store an asset in a project of somebody else", async () => {
      const { assets, project } = await setup();

      await assets.save(asset(project.id, "2026-01-02T10:00:00Z"), stranger);

      expect(await assets.listByProject(project.id, owner)).toHaveLength(0);
    });

    it("should list the most recent asset first", async () => {
      const { assets, project } = await setup();

      await assets.save(
        asset(project.id, "2026-01-02T10:00:00Z", "vieja.png"),
        owner,
      );
      await assets.save(
        asset(project.id, "2026-03-02T10:00:00Z", "nueva.png"),
        owner,
      );

      expect(
        (await assets.listByProject(project.id, owner)).map(
          (found) => found.originalName,
        ),
      ).toEqual(["nueva.png", "vieja.png"]);
    });

    it("should not list the assets of a project of somebody else", async () => {
      const { assets, project } = await setup();

      await assets.save(asset(project.id, "2026-01-02T10:00:00Z"), owner);

      expect(await assets.listByProject(project.id, stranger)).toHaveLength(0);
    });

    it("should delete an asset of the owner", async () => {
      const { assets, project } = await setup();
      const saved = asset(project.id, "2026-01-02T10:00:00Z");

      await assets.save(saved, owner);
      await assets.delete(saved.id, owner);

      expect(await assets.findById(saved.id, owner)).toBeNull();
    });

    it("should not delete an asset of somebody else", async () => {
      const { assets, project } = await setup();
      const saved = asset(project.id, "2026-01-02T10:00:00Z");

      await assets.save(saved, owner);
      await assets.delete(saved.id, stranger);

      expect(await assets.findById(saved.id, owner)).not.toBeNull();
    });

    it("should keep the date it was given", async () => {
      const { assets, project } = await setup();
      const saved = asset(project.id, "2026-01-02T10:00:00Z");

      await assets.save(saved, owner);

      expect(
        (await assets.findById(saved.id, owner))?.createdAt.toISOString(),
      ).toBe(saved.createdAt.toISOString());
    });
  });
}
