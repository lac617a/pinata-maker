import { describe, expect, it } from "vitest";

import type { ExportServices } from "../../application/export-printable-document";
import { createProject } from "../../application/manage-projects";
import { publishTemplateVersion } from "../../application/manage-template-versions";
import { InMemoryExportRepository } from "../../modules/exports/in-memory-export-repository";
import type {
  PrintableDocument,
  PrintDocument,
  PrintRenderer,
  PrintRenderOptions,
} from "../../modules/pdf-generation/print-renderer";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
  sanitizePdfFileName,
} from "../../modules/pdf-generation/print-renderer";
import { InMemoryProjectRepository } from "../../modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "../../modules/storage/in-memory-object-storage";
import { InMemoryTemplateVersionRepository } from "../../modules/templates/in-memory-template-version-repository";
import { squareTemplate } from "../../modules/templates/template-version-repository.contract";
import {
  handleDeleteExport,
  handleDownloadExport,
  handleExportTemplateVersion,
  handleListProjectExports,
} from "./export-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

class FakeRenderer implements PrintRenderer {
  async render(
    document: PrintDocument,
    options: PrintRenderOptions = {},
  ): Promise<PrintableDocument> {
    return {
      fileName: sanitizePdfFileName(options.fileName ?? "documento.pdf"),
      contentType: PDF_CONTENT_TYPE,
      pageCount: documentPageCount(document),
      bytes: Uint8Array.from([37, 80, 68, 70]),
    };
  }
}

function services(): ExportServices & { exportStorage: InMemoryObjectStorage } {
  const projects = new InMemoryProjectRepository();
  const exportStorage = new InMemoryObjectStorage();

  let clock = 0;
  let sequence = 0;

  return {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    exports: new InMemoryExportRepository(projects),
    exportStorage,
    renderer: new FakeRenderer(),
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newTemplateVersionId: () => `tttttttt-0000-4000-8000-00000000000${++sequence}`,
    newExportId: () => `eeeeeeee-0000-4000-8000-00000000000${++sequence}`,
  };
}

function exportRequest(body: unknown): Request {
  return new Request("http://localhost/api/projects/x/exports", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function published(context: ExportServices, ownerId = owner) {
  const project = await createProject(context, { ownerId, name: "Elefante" });

  const version = await publishTemplateVersion(context, {
    projectId: project.id,
    userId: ownerId,
    template: squareTemplate("Elefante"),
  });

  return { project, version };
}

describe("Export endpoints", () => {
  it("should generate the document of a template version", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.export.templateVersionId).toBe(version.id);
    expect(body.export.pageCount).toBe(2);
  });

  it("should not expose where the document is stored", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: owner },
    );

    expect((await response.json()).export).not.toHaveProperty("storageKey");
  });

  it("should lay the document out on the paper that was asked for", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({
        templateVersionId: version.id,
        paper: { format: "A3", orientation: "LANDSCAPE" },
      }),
      project.id,
      { services: shared, userId: owner },
    );

    const body = await response.json();

    expect(body.export.paperFormat).toBe("A3");
    expect(body.export.paperOrientation).toBe("LANDSCAPE");
  });

  it("should refuse a paper format it does not know", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({
        templateVersionId: version.id,
        paper: { format: "A0", orientation: "PORTRAIT" },
      }),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_EXPORT");
  });

  it("should refuse a request that does not say what to export", async () => {
    const shared = services();
    const { project } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({}),
      project.id,
      { services: shared, userId: owner },
    );

    expect(response.status).toBe(400);
  });

  it("should hand out a temporary link to download the document", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const created = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: owner },
    );

    const { export: generated } = await created.json();

    const response = await handleDownloadExport(generated.id, {
      services: shared,
      userId: owner,
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.export.url).toContain(project.id);
  });

  it("should list the documents of the project, newest first", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    for (const _unused of [1, 2]) {
      await handleExportTemplateVersion(
        exportRequest({ templateVersionId: version.id }),
        project.id,
        { services: shared, userId: owner },
      );
    }

    const response = await handleListProjectExports(project.id, {
      services: shared,
      userId: owner,
    });

    expect((await response.json()).exports).toHaveLength(2);
  });

  it("should delete a document of the project", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const created = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: owner },
    );

    const { export: generated } = await created.json();

    const response = await handleDeleteExport(generated.id, {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(204);
    expect(shared.exportStorage.keys()).toHaveLength(0);
  });

  it("should answer 401 to every operation without a session", async () => {
    const shared = services();

    const responses = await Promise.all([
      handleExportTemplateVersion(exportRequest({}), "x", {
        services: shared,
        userId: null,
      }),
      handleListProjectExports("x", { services: shared, userId: null }),
      handleDownloadExport("x", { services: shared, userId: null }),
      handleDeleteExport("x", { services: shared, userId: null }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401,
    ]);
  });

  it("should answer 404 when the version is of somebody else", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const response = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: stranger },
    );

    // 404 y no 403: un 403 confirmaría que la versión existe.
    expect(response.status).toBe(404);
  });

  it("should answer the same for a document of somebody else and one that never existed", async () => {
    const shared = services();
    const { project, version } = await published(shared);

    const created = await handleExportTemplateVersion(
      exportRequest({ templateVersionId: version.id }),
      project.id,
      { services: shared, userId: owner },
    );

    const { export: generated } = await created.json();

    const foreign = await handleDownloadExport(generated.id, {
      services: shared,
      userId: stranger,
    });

    const missing = await handleDownloadExport(
      "eeeeeeee-0000-4000-8000-0000000000ff",
      { services: shared, userId: stranger },
    );

    expect(foreign.status).toBe(404);
    expect(await foreign.json()).toEqual(await missing.json());
  });
});
