import { describe, expect, it } from "vitest";

import { InvalidProjectTransitionError } from "@/modules/projects/errors";
import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";

import {
  advanceProject,
  createProject,
  listProjects,
  openProject,
  type ProjectServices,
  renameUserProject,
} from "./manage-projects";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

/** Reloj e identificadores controlados: el resultado debe ser reproducible. */
function services(): ProjectServices {
  let clock = 0;
  let sequence = 0;

  return {
    repository: new InMemoryProjectRepository(),
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `aaaaaaaa-0000-4000-8000-00000000000${++sequence}`,
  };
}

describe("Manage projects", () => {
  it("should create a project owned by whoever asked for it", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    expect(project.ownerId).toBe(owner);
    expect(project.status).toBe("DRAFT");
    expect(await openProject(context, project.id, owner)).toEqual(project);
  });

  it("should list only the projects of the user who asks", async () => {
    const context = services();

    await createProject(context, { ownerId: owner, name: "Mío" });
    await createProject(context, { ownerId: stranger, name: "Ajeno" });

    expect((await listProjects(context, owner)).map((p) => p.name)).toEqual([
      "Mío",
    ]);
  });

  it("should not open a project of somebody else", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    await expect(openProject(context, project.id, stranger)).rejects.toThrow(
      ProjectNotFoundError,
    );
  });

  it("should report a missing project the same way as a foreign one", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    // Distinguirlos permitiría averiguar qué identificadores existen.
    const foreign = await openProject(context, project.id, stranger).catch(
      (error) => error,
    );
    const missing = await openProject(context, "no-existe", owner).catch(
      (error) => error,
    );

    expect(foreign.code).toBe(missing.code);
  });

  it("should record a new name", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    const renamed = await renameUserProject(
      context,
      project.id,
      owner,
      "Unicornio",
    );

    expect(renamed.name).toBe("Unicornio");
    expect(renamed.updatedAt.getTime()).toBeGreaterThan(
      project.updatedAt.getTime(),
    );
  });

  it("should not rename a project of somebody else", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    await expect(
      renameUserProject(context, project.id, stranger, "Robado"),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("should move the project through its lifecycle", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    await advanceProject(context, project.id, owner, "PROCESSING");
    const ready = await advanceProject(context, project.id, owner, "READY");

    expect(ready.status).toBe("READY");
  });

  it("should leave the transition rules to the domain", async () => {
    const context = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    await expect(
      advanceProject(context, project.id, owner, "READY"),
    ).rejects.toThrow(InvalidProjectTransitionError);
  });
});
