import { describe, expect, it } from "vitest";

import { createProject } from "../../application/manage-projects";
import type { AssetServices } from "../../application/upload-project-image";
import { InMemoryAssetRepository } from "../../modules/assets/in-memory-asset-repository";
import { InMemoryObjectStorage } from "../../modules/storage/in-memory-object-storage";
import { IMAGE_LIMITS } from "../../modules/image-processing/image-validation";
import { InMemoryProjectRepository } from "../../modules/projects/in-memory-project-repository";
import {
  handleDeleteProjectImage,
  handleListProjectImages,
  handleUploadProjectImage,
  IMAGE_FIELD,
  type AssetRequestContext,
} from "./asset-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): AssetServices & { storage: InMemoryObjectStorage } {
  const projects = new InMemoryProjectRepository();
  const storage = new InMemoryObjectStorage();

  let clock = 0;
  let sequence = 0;

  return {
    repository: projects,
    assets: new InMemoryAssetRepository(projects),
    storage,
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newAssetId: () => `aaaaaaaa-0000-4000-8000-00000000000${++sequence}`,
  };
}

function upload(file: {
  name: string;
  type: string;
  size?: number;
}): Request {
  const form = new FormData();
  const bytes = new Uint8Array(new ArrayBuffer(file.size ?? 8));

  form.set(IMAGE_FIELD, new File([bytes], file.name, { type: file.type }));

  return new Request("http://localhost/api/projects/x/images", {
    method: "POST",
    body: form,
  });
}

const png = { name: "elefante.png", type: "image/png" };

describe("Project image endpoints", () => {
  it("should store an image of the project", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleUploadProjectImage(upload(png), project.id, {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.asset.originalName).toBe("elefante.png");
    expect(body.asset.kind).toBe("ORIGINAL_IMAGE");
  });

  it("should not expose where the file is stored", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleUploadProjectImage(upload(png), project.id, {
      services: shared,
      userId: owner,
    });

    // La ruta es detalle de infraestructura y no le sirve a quien consume
    // la API.
    expect(await response.json()).not.toHaveProperty("asset.storageKey");
  });

  it("should refuse every operation without a session", async () => {
    const anonymous: AssetRequestContext = {
      services: services(),
      userId: null,
    };

    const responses = await Promise.all([
      handleUploadProjectImage(upload(png), "whatever", anonymous),
      handleListProjectImages("whatever", anonymous),
      handleDeleteProjectImage("whatever", anonymous),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  it("should refuse to upload into a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleUploadProjectImage(upload(png), project.id, {
      services: shared,
      userId: stranger,
    });

    expect(response.status).toBe(404);
    expect(shared.storage.keys()).toHaveLength(0);
  });

  it("should reject a request without a file", async () => {
    const shared = services();
    const request = new Request("http://localhost/api/projects/x/images", {
      method: "POST",
      body: new FormData(),
    });

    const response = await handleUploadProjectImage(request, "x", {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_ASSET");
  });

  it("should reject a format it cannot read", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleUploadProjectImage(
      upload({ name: "dibujo.svg", type: "image/svg+xml" }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(415);
  });

  it("should reject an oversized file before reading it", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleUploadProjectImage(
      upload({ ...png, size: IMAGE_LIMITS.maxFileBytes + 1 }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
    expect(shared.storage.keys()).toHaveLength(0);
  });

  it("should list the images with a temporary link", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    await handleUploadProjectImage(upload(png), project.id, {
      services: shared,
      userId: owner,
    });

    const body = await (
      await handleListProjectImages(project.id, {
        services: shared,
        userId: owner,
      })
    ).json();

    expect(body.images).toHaveLength(1);
    expect(body.images[0].url).toBeTruthy();
  });

  it("should not list the images of a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleListProjectImages(project.id, {
      services: shared,
      userId: stranger,
    });

    expect(response.status).toBe(404);
  });

  it("should delete an image of the user", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const uploaded = await (
      await handleUploadProjectImage(upload(png), project.id, {
        services: shared,
        userId: owner,
      })
    ).json();

    const response = await handleDeleteProjectImage(uploaded.asset.id, {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(204);
    expect(shared.storage.keys()).toHaveLength(0);
  });

  it("should not delete an image of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const uploaded = await (
      await handleUploadProjectImage(upload(png), project.id, {
        services: shared,
        userId: owner,
      })
    ).json();

    const response = await handleDeleteProjectImage(uploaded.asset.id, {
      services: shared,
      userId: stranger,
    });

    expect(response.status).toBe(404);
    expect(shared.storage.keys()).toHaveLength(1);
  });
});
