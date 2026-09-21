import { describe, expect, it } from "vitest";

import {
  createProject,
  type ProjectServices,
} from "@/application/manage-projects";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";

import {
  handleCreateProject,
  handleGetProject,
  handleListProjects,
  handleRenameProject,
  type ProjectRequestContext,
} from "./project-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): ProjectServices {
  let clock = 0;
  let sequence = 0;

  return {
    repository: new InMemoryProjectRepository(),
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `aaaaaaaa-0000-4000-8000-00000000000${++sequence}`,
  };
}

function context(
  userId: string | null,
  shared: ProjectServices = services(),
): ProjectRequestContext {
  return { services: shared, userId };
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("Project endpoints", () => {
  it("should create a project for the authenticated user", async () => {
    const response = await handleCreateProject(
      post({ name: "Elefante" }),
      context(owner),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.project.name).toBe("Elefante");
    expect(body.project.status).toBe("DRAFT");
  });

  it("should not expose who owns the project", async () => {
    // Quien lo recibe ya sabe que es suyo: si no lo fuera, no lo habría
    // recibido.
    const response = await handleCreateProject(
      post({ name: "Elefante" }),
      context(owner),
    );

    expect(await response.json()).not.toHaveProperty("project.ownerId");
  });

  it("should refuse every operation without a session", async () => {
    const anonymous = context(null);

    const responses = await Promise.all([
      handleListProjects(anonymous),
      handleCreateProject(post({ name: "Elefante" }), anonymous),
      handleGetProject("whatever", anonymous),
      handleRenameProject(post({ name: "x" }), "whatever", anonymous),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  it("should reject a project without a name", async () => {
    const response = await handleCreateProject(
      post({ name: "   " }),
      context(owner),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_PROJECT");
  });

  it("should treat a body that is not JSON as missing data", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      body: "no soy json",
    });

    expect((await handleCreateProject(request, context(owner))).status).toBe(
      400,
    );
  });

  it("should list only the projects of the user who asks", async () => {
    const shared = services();

    await createProject(shared, { ownerId: owner, name: "Mío" });
    await createProject(shared, { ownerId: stranger, name: "Ajeno" });

    const body = await (
      await handleListProjects(context(owner, shared))
    ).json();

    expect(
      body.projects.map((project: { name: string }) => project.name),
    ).toEqual(["Mío"]);
  });

  it("should answer 404 for a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleGetProject(
      project.id,
      context(stranger, shared),
    );

    // El mismo 404 que un proyecto inexistente: un 403 confirmaría que
    // existe. Ver AC-15.
    expect(response.status).toBe(404);
  });

  it("should answer the same for a project that never existed", async () => {
    const shared = services();
    const missing = await handleGetProject("no-existe", context(owner, shared));
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });
    const foreign = await handleGetProject(
      project.id,
      context(stranger, shared),
    );

    expect(missing.status).toBe(foreign.status);
    expect((await missing.json()).code).toBe((await foreign.json()).code);
  });

  it("should rename a project of the user", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleRenameProject(
      post({ name: "Unicornio" }),
      project.id,
      context(owner, shared),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).project.name).toBe("Unicornio");
  });

  it("should not rename a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleRenameProject(
      post({ name: "Robado" }),
      project.id,
      context(stranger, shared),
    );

    expect(response.status).toBe(404);
    expect((await shared.repository.findById(project.id, owner))?.name).toBe(
      "Elefante",
    );
  });
});
