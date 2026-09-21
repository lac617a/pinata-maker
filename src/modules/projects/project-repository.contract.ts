import { describe, expect, it } from "vitest";

import { createProject, type Project, transitionProject } from "./project";
import type { ProjectRepository } from "./project-repository";

/**
 * Qué significa cumplir el contrato del repositorio.
 *
 * Se ejecuta contra cada implementación, de modo que «el repositorio
 * funciona» quiere decir lo mismo para la que guarda en memoria y para la que
 * habla con Supabase. Ver docs/AGENTS.md §27.
 *
 * El contrato no dice **cómo** se guarda. Dice qué debe observarse después.
 */
export function describeProjectRepository(
  implementation: string,
  createRepository: () => Promise<ProjectRepository> | ProjectRepository,
): void {
  const owner = "11111111-1111-1111-1111-111111111111";
  const stranger = "22222222-2222-2222-2222-222222222222";

  const project = (id: string, ownerId = owner, name = "Elefante"): Project =>
    createProject({ id, ownerId, name, now: new Date("2026-01-01T10:00:00Z") });

  describe(`Project repository (${implementation})`, () => {
    it("should return a saved project to its owner", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-000000000001");

      await repository.save(saved);

      expect(await repository.findById(saved.id, owner)).toMatchObject({
        id: saved.id,
        name: "Elefante",
        status: "DRAFT",
      });
    });

    it("should hide a project from anyone else", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-000000000002");

      await repository.save(saved);

      // Un proyecto ajeno responde como uno inexistente: decir «existe pero
      // no es tuyo» revelaría qué identificadores hay. Ver AC-15.
      expect(await repository.findById(saved.id, stranger)).toBeNull();
    });

    it("should report a project that was never saved as missing", async () => {
      const repository = await createRepository();

      expect(
        await repository.findById(
          "aaaaaaaa-0000-4000-8000-00000000ffff",
          owner,
        ),
      ).toBeNull();
    });

    it("should list only the projects of the owner", async () => {
      const repository = await createRepository();

      await repository.save(project("aaaaaaaa-0000-4000-8000-000000000003"));
      await repository.save(
        project("aaaaaaaa-0000-4000-8000-000000000004", stranger, "Ajeno"),
      );

      const mine = await repository.listByOwner(owner);

      expect(mine).toHaveLength(1);
      expect(mine[0].name).toBe("Elefante");
    });

    it("should list the most recently updated project first", async () => {
      const repository = await createRepository();

      const older = project(
        "aaaaaaaa-0000-4000-8000-000000000005",
        owner,
        "Viejo",
      );
      const newer = transitionProject(
        project("aaaaaaaa-0000-4000-8000-000000000006", owner, "Nuevo"),
        "PROCESSING",
        new Date("2026-02-01T10:00:00Z"),
      );

      await repository.save(older);
      await repository.save(newer);

      expect(
        (await repository.listByOwner(owner)).map((found) => found.name),
      ).toEqual(["Nuevo", "Viejo"]);
    });

    it("should overwrite a project saved again", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-000000000007");

      await repository.save(saved);
      await repository.save(
        transitionProject(
          saved,
          "PROCESSING",
          new Date("2026-03-01T10:00:00Z"),
        ),
      );

      const found = await repository.findById(saved.id, owner);

      expect(found?.status).toBe("PROCESSING");
      expect(await repository.listByOwner(owner)).toHaveLength(1);
    });

    it("should delete a project of the owner", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-000000000008");

      await repository.save(saved);
      await repository.delete(saved.id, owner);

      expect(await repository.findById(saved.id, owner)).toBeNull();
    });

    it("should not delete a project of somebody else", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-000000000009");

      await repository.save(saved);
      await repository.delete(saved.id, stranger);

      expect(await repository.findById(saved.id, owner)).not.toBeNull();
    });

    it("should keep the dates it was given", async () => {
      const repository = await createRepository();
      const saved = project("aaaaaaaa-0000-4000-8000-00000000000a");

      await repository.save(saved);

      const found = await repository.findById(saved.id, owner);

      expect(found?.createdAt.toISOString()).toBe(
        saved.createdAt.toISOString(),
      );
    });
  });
}
