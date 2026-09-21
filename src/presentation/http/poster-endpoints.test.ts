import { describe, expect, it } from "vitest";

import type { UsageServices } from "@/application/daily-usage";
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
import { InMemoryUsageCounter } from "@/modules/usage/in-memory-usage-counter";
import { DEFAULT_USAGE_LIMITS } from "@/modules/usage/usage";

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

function usage(): UsageServices {
  return {
    usage: new InMemoryUsageCounter(),
    limits: DEFAULT_USAGE_LIMITS,
    now: () => new Date(Date.UTC(2026, 8, 21, 10)),
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
      { services: shared, userId: owner, usage: usage() },
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

  it("should count the poster in the daily limit of the account", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600 }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect((await response.json()).usage).toMatchObject({
      level: "REGISTERED",
      limit: 20,
      remaining: 19,
    });
  });

  it("should answer 429 when the account has used all of today", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);
    const spent = usage();

    await spent.usage.consume([`user:${owner}`], "2026-09-21", 1);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600 }),
      project.id,
      {
        services: shared,
        userId: owner,
        usage: { ...spent, limits: { ...DEFAULT_USAGE_LIMITS, REGISTERED: 1 } },
      },
    );

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("USAGE_LIMIT_REACHED");
    // Se niega antes de generar: no queda ningún documento guardado.
    expect((shared.exportStorage as InMemoryObjectStorage).keys()).toHaveLength(
      0,
    );
  });

  it("should print without overlap when the sheets are trimmed", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const overlapped = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600 }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );
    const trimmed = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600, joining: "TRIM" }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    // Sin franja repetida, 60 cm caben en menos hojas.
    expect((await trimmed.json()).export.pageCount).toBeLessThan(
      (await overlapped.json()).export.pageCount,
    );
  });

  it("should refuse an unknown way of joining the sheets", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600, joining: "GLUE" }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect(response.status).toBe(400);
  });

  it("should refuse a request that gives both sides", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    // Dos medidas obligarían a elegir cuál manda o a deformar la figura.
    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600, height: 600 }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_POSTER_SIZE");
  });

  it("should refuse a crop that is not four numbers", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600, crop: { x: "0" } }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_IMAGE_CROP");
  });

  it("should print only the crop when one is given", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({
        assetId: asset.id,
        width: 600,
        crop: { x: 0, y: 0, width: 720, height: 720 },
      }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect(response.status).toBe(201);
    expect((await response.json()).export.height).toBeCloseTo(600, 6);
  });

  it("should refuse a request without an image", async () => {
    const shared = services();
    const { project } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ width: 600 }),
      project.id,
      { services: shared, userId: owner, usage: usage() },
    );

    expect(response.status).toBe(400);
  });

  it("should answer 401 without a session", async () => {
    const response = await handleExportPoster(
      posterRequest({ assetId: "x", width: 600 }),
      "x",
      { services: services(), userId: null, usage: usage() },
    );

    expect(response.status).toBe(401);
  });

  it("should answer 404 for a project of somebody else", async () => {
    const shared = services();
    const { project, asset } = await projectWithImage(shared);

    const response = await handleExportPoster(
      posterRequest({ assetId: asset.id, width: 600 }),
      project.id,
      { services: shared, userId: stranger, usage: usage() },
    );

    expect(response.status).toBe(404);
  });
});
