import { describe, expect, it } from "vitest";

import type { ExportServices } from "@/application/export-printable-document";
import { createProject } from "@/application/manage-projects";
import { createAsset } from "@/modules/assets/asset";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import { InMemoryExportRepository } from "@/modules/exports/in-memory-export-repository";
import { pngHeader } from "@/modules/image-processing/image-header.fixtures";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
} from "@/modules/pdf-generation/print-renderer";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";
import { InMemoryTemplateVersionRepository } from "@/modules/templates/in-memory-template-version-repository";

import { handleExportPoster } from "./poster-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): ExportServices {
  const projects = new InMemoryProjectRepository();
  let sequence = 0;

  return {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    exports: new InMemoryExportRepository(projects),
    assets: new InMemoryAssetRepository(projects),
    assetStorage: new InMemoryObjectStorage(),
    exportStorage: new InMemoryObjectStorage(),
    renderer: {
      render: async (document, options = {}) => ({
        fileName: options.fileName ?? "x.pdf",
        contentType: PDF_CONTENT_TYPE,
        pageCount: documentPageCount(document),
        bytes: new Uint8Array([37, 80, 68, 70]),
      }),
    },
    now: () => new Date(Date.UTC(2026, 8, 21, 10, ++sequence)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newTemplateVersionId: () =>
      `tttttttt-0000-4000-8000-0000000000${++sequence}`,
    newExportId: () => `eeeeeeee-0000-4000-8000-0000000000${++sequence}`,
  };
}

async function projectWithImage(context: ExportServices) {
  const project = await createProject(context, {
    ownerId: owner,
    name: "Spiderman 4",
  });

  const asset = createAsset({
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    projectId: project.id,
    kind: "ORIGINAL_IMAGE",
    mimeType: "image/png",
    byteSize: 64,
    originalName: "cuatro.png",
    now: new Date(Date.UTC(2026, 8, 21)),
  });

  await context.assets.save(asset, owner);
  await context.assetStorage.put({
    key: asset.storageKey,
    contentType: asset.mimeType,
    bytes: pngHeader(720, 894),
  });

  return { project, asset };
}

function posterRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/x/posters", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Poster endpoints", () => {
  it("should generate the poster of an image", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({
        assetId: asset.id,
        width: 600,
        paper: { format: "LETTER", orientation: "PORTRAIT" },
      }),
      project.id,
      { services: shared, userId: owner },
    );

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.export).toMatchObject({
      sourceAssetId: asset.id,
      width: 600,
      paperFormat: "LETTER",
    });
    expect(body.export).not.toHaveProperty("storageKey");
  });

  it("should refuse a request that gives both sides", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    // Dos medidas obligarían a elegir cuál manda o a deformar la figura.
    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600, height: 600 }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_POSTER_SIZE");
  });

  it("should refuse a request without an image", async () => {
    const shared = services();
    const { project } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ width: 600 }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
  });

  it("should answer 401 without a session", async () => {
    const response = await handleExportPoster(
      posterRequest({ assetId: "x", width: 600 }),
      "x",
      { services: services(), userId: null },
    );

    expect(response.status).toBe(401);
  });

  it("should answer 404 for a project of somebody else", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600 }),
      project.id,
      { services: shared, userId: stranger },
    );

    expect(response.status).toBe(404);
  });
});
