import { describe, expect, it } from "vitest";

import { createAsset } from "@/modules/assets/asset";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import { InMemoryExportRepository } from "@/modules/exports/in-memory-export-repository";
import { pngHeader } from "@/modules/image-processing/image-header.fixtures";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
} from "@/modules/pdf-generation/print-renderer";
import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";
import { InMemoryTemplateVersionRepository } from "@/modules/templates/in-memory-template-version-repository";

import {
  type AccountServices,
  deleteAccount,
  deleteProjectWithFiles,
} from "./delete-account";
import { exportPoster } from "./export-poster";
import { createProject } from "./manage-projects";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services() {
  const projects = new InMemoryProjectRepository();
  const assetStorage = new InMemoryObjectStorage();
  const exportStorage = new InMemoryObjectStorage();
  let sequence = 0;
  const removal = { calls: 0, projectsLeft: -1 };

  const context: AccountServices & {
    templateVersions: InMemoryTemplateVersionRepository;
  } = {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    assets: new InMemoryAssetRepository(projects),
    exports: new InMemoryExportRepository(projects),
    assetStorage,
    exportStorage,
    accounts: {
      deleteCurrentAccount: async () => {
        removal.calls++;
        removal.projectsLeft = (await projects.listByOwner(owner)).length;
      },
    },
    now: () => new Date(Date.UTC(2026, 8, 21, 10, ++sequence)),
    newId: () =>
      `pppppppp-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
  };

  const exportServices = {
    ...context,
    renderer: {
      render: async (
        document: Parameters<typeof documentPageCount>[0],
        options: { fileName?: string } = {},
      ) => ({
        fileName: options.fileName ?? "x.pdf",
        contentType: PDF_CONTENT_TYPE,
        pageCount: documentPageCount(document),
        bytes: new Uint8Array([37, 80, 68, 70]),
      }),
    },
    newTemplateVersionId: () =>
      `tttttttt-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    newExportId: () =>
      `eeeeeeee-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
  };

  return { context, exportServices, assetStorage, exportStorage, removal };
}

/** A project with an image in its bucket and a poster PDF in the other. */
async function projectWithFiles(
  shared: ReturnType<typeof services>,
  name: string,
) {
  const project = await createProject(shared.context, { ownerId: owner, name });
  const asset = createAsset({
    id: shared.context.newId(),
    projectId: project.id,
    kind: "ORIGINAL_IMAGE",
    mimeType: "image/png",
    byteSize: 64,
    originalName: "cuatro.png",
    now: new Date(Date.UTC(2026, 8, 21)),
  });

  await shared.context.assets.save(asset, owner);
  await shared.assetStorage.put({
    key: asset.storageKey,
    contentType: asset.mimeType,
    bytes: pngHeader(720, 894),
  });
  await exportPoster(shared.exportServices, {
    projectId: project.id,
    userId: owner,
    assetId: asset.id,
    size: { width: 600 },
  });

  return project;
}

describe("Delete a project with its files", () => {
  it("should remove its images and PDFs from the buckets, then the project", async () => {
    const shared = services();
    const project = await projectWithFiles(shared, "Elefante");

    expect(shared.assetStorage.keys()).toHaveLength(1);
    expect(shared.exportStorage.keys()).toHaveLength(1);

    await deleteProjectWithFiles(shared.context, project.id, owner);

    expect(shared.assetStorage.keys()).toHaveLength(0);
    expect(shared.exportStorage.keys()).toHaveLength(0);
    expect(await shared.context.repository.listByOwner(owner)).toHaveLength(0);
  });

  it("should keep the project when a file cannot be removed", async () => {
    const shared = services();
    const project = await projectWithFiles(shared, "Elefante");

    // Borrar primero el proyecto dejaría archivos que ya nadie puede borrar.
    shared.context.exportStorage.remove = async () => {
      throw new Error("storage down");
    };

    await expect(
      deleteProjectWithFiles(shared.context, project.id, owner),
    ).rejects.toThrow("storage down");
    expect(await shared.context.repository.listByOwner(owner)).toHaveLength(1);
  });

  it("should not touch a project of somebody else", async () => {
    const shared = services();
    const project = await projectWithFiles(shared, "Elefante");

    await expect(
      deleteProjectWithFiles(shared.context, project.id, stranger),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(shared.assetStorage.keys()).toHaveLength(1);
  });
});

describe("Delete an account", () => {
  it("should remove every project and file before the account", async () => {
    const shared = services();

    await projectWithFiles(shared, "Uno");
    await projectWithFiles(shared, "Dos");

    await deleteAccount(shared.context, owner);

    expect(shared.assetStorage.keys()).toHaveLength(0);
    expect(shared.exportStorage.keys()).toHaveLength(0);
    // La cuenta se borra una vez, y cuando ya no le queda ningún proyecto.
    expect(shared.removal).toEqual({ calls: 1, projectsLeft: 0 });
  });

  it("should delete an account that has nothing yet", async () => {
    const shared = services();

    await deleteAccount(shared.context, owner);

    expect(shared.removal.calls).toBe(1);
  });
});
