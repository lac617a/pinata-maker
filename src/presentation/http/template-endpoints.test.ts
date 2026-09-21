import { describe, expect, it } from "vitest";

import { createProject } from "../../application/manage-projects";
import type { TemplateVersionServices } from "../../application/manage-template-versions";
import { InMemoryProjectRepository } from "../../modules/projects/in-memory-project-repository";
import { InMemoryTemplateVersionRepository } from "../../modules/templates/in-memory-template-version-repository";
import {
  serializeTemplate,
  TEMPLATE_DEFINITION_LIMITS,
} from "../../modules/templates/template-definition";
import { squareTemplate } from "../../modules/templates/template-version-repository.contract";
import {
  handleGetTemplateVersion,
  handleListTemplateVersions,
  handlePublishTemplateVersion,
} from "./template-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): TemplateVersionServices {
  const projects = new InMemoryProjectRepository();

  let clock = 0;
  let sequence = 0;

  return {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newTemplateVersionId: () => `tttttttt-0000-4000-8000-00000000000${++sequence}`,
  };
}

function publishRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/x/templates", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const template = () => serializeTemplate(squareTemplate());

describe("Template version endpoints", () => {
  it("should publish a version of the project template", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.version.versionNumber).toBe(1);
    expect(body.version.pieceCount).toBe(1);
  });

  it("should not carry the geometry in the publish response", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: owner },
    );

    // Quien publica ya tiene la plantilla: devolvérsela solo gasta ancho de
    // banda.
    expect(await response.json()).not.toHaveProperty("version.template");
  });

  it("should return the geometry when a single version is asked for", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const published = await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: owner },
    );

    const { version } = await published.json();

    const response = await handleGetTemplateVersion(version.id, {
      services: shared,
      userId: owner,
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.version.template).toEqual(template());
  });

  it("should list the versions of the project, newest first", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    for (const _unused of [1, 2]) {
      await handlePublishTemplateVersion(
        publishRequest({ template: template() }),
        project.id,
        { services: shared, userId: owner },
      );
    }

    const response = await handleListTemplateVersions(project.id, {
      services: shared,
      userId: owner,
    });

    const body = await response.json();

    expect(body.versions.map((v: { versionNumber: number }) => v.versionNumber)).toEqual([
      2, 1,
    ]);
    expect(body.versions[0]).not.toHaveProperty("template");
  });

  it("should refuse a template that is not valid geometry", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const broken = template();
    const [piece] = broken.pieces;

    const response = await handlePublishTemplateVersion(
      publishRequest({
        template: {
          ...broken,
          pieces: [
            {
              ...piece,
              geometry: {
                ...piece.geometry,
                // Un contorno abierto no delimita una pieza física.
                outerContours: [
                  { ...piece.geometry.outerContours[0], closed: false },
                ],
              },
            },
          ],
        },
      }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_TEMPLATE_DEFINITION");
  });

  it("should refuse a template larger than the format allows", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const flooded = template();
    const [piece] = flooded.pieces;

    const response = await handlePublishTemplateVersion(
      publishRequest({
        template: {
          ...flooded,
          pieces: Array.from(
            { length: TEMPLATE_DEFINITION_LIMITS.maxPieces + 1 },
            () => piece,
          ),
        },
      }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
  });

  it("should refuse a request without a template at all", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handlePublishTemplateVersion(
      publishRequest({}),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
  });

  it("should report a conflict when somebody published first", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: owner },
    );

    const response = await handlePublishTemplateVersion(
      publishRequest({ template: template(), expectedVersionNumber: 0 }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("TEMPLATE_VERSION_CONFLICT");
  });

  it("should answer 401 to every operation without a session", async () => {
    const shared = services();

    const responses = await Promise.all([
      handlePublishTemplateVersion(publishRequest({ template: template() }), "x", {
        services: shared,
        userId: null,
      }),
      handleListTemplateVersions("x", { services: shared, userId: null }),
      handleGetTemplateVersion("x", { services: shared, userId: null }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401,
    ]);
  });

  it("should answer 404 for a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: stranger },
    );

    // 404 y no 403: un 403 confirmaría que el proyecto existe.
    expect(response.status).toBe(404);
  });

  it("should answer the same for a version of somebody else and one that never existed", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const published = await handlePublishTemplateVersion(
      publishRequest({ template: template() }),
      project.id,
      { services: shared, userId: owner },
    );

    const { version } = await published.json();

    const foreign = await handleGetTemplateVersion(version.id, {
      services: shared,
      userId: stranger,
    });

    const missing = await handleGetTemplateVersion("tttttttt-0000-4000-8000-0000000000ff", {
      services: shared,
      userId: stranger,
    });

    expect(foreign.status).toBe(404);
    expect(await foreign.json()).toEqual(await missing.json());
  });
});
