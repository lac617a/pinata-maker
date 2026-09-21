import { describe, expect, it } from "vitest";

import { createAsset } from "@/modules/assets/asset";
import { AssetNotFoundError } from "@/modules/assets/errors";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import { InMemoryExportRepository } from "@/modules/exports/in-memory-export-repository";
import {
  jpegHeader,
  pngHeader,
} from "@/modules/image-processing/image-header.fixtures";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
  type PrintDocument,
  type PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import {
  InvalidImageCropError,
  InvalidPosterSizeError,
} from "@/modules/posters/errors";
import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";
import { InMemoryTemplateVersionRepository } from "@/modules/templates/in-memory-template-version-repository";

import { exportPoster } from "./export-poster";
import type { ExportServices } from "./export-printable-document";
import { createProject } from "./manage-projects";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services() {
  const projects = new InMemoryProjectRepository();
  const rendered: PrintDocument[] = [];

  // El caso de uso no genera el PDF: se prueba qué le pide al renderer.
  const renderer: PrintRenderer = {
    render: async (document, options = {}) => {
      rendered.push(document);

      return {
        fileName: options.fileName ?? "x.pdf",
        contentType: PDF_CONTENT_TYPE,
        pageCount: documentPageCount(document),
        bytes: new Uint8Array([37, 80, 68, 70]),
      };
    },
  };

  let sequence = 0;

  const context: ExportServices & {
    exportStorage: InMemoryObjectStorage;
    assetStorage: InMemoryObjectStorage;
  } = {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    exports: new InMemoryExportRepository(projects),
    assets: new InMemoryAssetRepository(projects),
    assetStorage: new InMemoryObjectStorage(),
    exportStorage: new InMemoryObjectStorage(),
    renderer,
    now: () => new Date(Date.UTC(2026, 8, 21, 10, ++sequence)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newTemplateVersionId: () =>
      `tttttttt-0000-4000-8000-0000000000${++sequence}`,
    newExportId: () => `eeeeeeee-0000-4000-8000-0000000000${++sequence}`,
  };

  return { context, rendered };
}

/** Un proyecto con su imagen de 720 × 894, la de ejemplo del usuario. */
async function projectWithImage(context: ExportServices, name = "Spiderman 4") {
  const project = await createProject(context, { ownerId: owner, name });

  const asset = createAsset({
    id: `aaaaaaaa-0000-4000-8000-${project.id.slice(-12)}`,
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

describe("Export poster", () => {
  it("should size the poster from the image stored, not from the request", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    const generated = await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 600 },
    });

    // El alto sale de la cabecera del archivo guardado: 600 × 894 / 720.
    expect(generated.width).toBe(600);
    expect(generated.height).toBeCloseTo(745, 0);
  });

  it("should remember which image the poster came from", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    const generated = await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 600 },
    });

    expect(generated.sourceAssetId).toBe(asset.id);
    expect(generated.templateVersionId).toBeNull();
    expect(context.exportStorage.keys()).toEqual([generated.storageKey]);
  });

  it("should draw the stored bytes across the sheets", async () => {
    const { context, rendered } = services();
    const { project, asset } = await projectWithImage(context);

    await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { height: 900 },
    });

    const [section] = rendered[0].sections;

    expect(section.kind).toBe("POSTER");
    expect(section.artwork?.image.format).toBe("PNG");
    expect(rendered[0].cover).toMatchObject({ kind: "POSTER" });
  });

  it("should take the proportion of the crop, not of the whole image", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    const generated = await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 600 },
      crop: { x: 0, y: 0, width: 720, height: 360 },
    });

    // Media imagen de alto: el póster sale el doble de ancho que de alto.
    expect(generated.height).toBeCloseTo(300, 6);
  });

  it("should refuse a crop that falls outside the stored image", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    // El navegador puede creer que la imagen es más grande; manda el archivo.
    await expect(
      exportPoster(context, {
        projectId: project.id,
        userId: owner,
        assetId: asset.id,
        size: { width: 600 },
        crop: { x: 0, y: 0, width: 1000, height: 894 },
      }),
    ).rejects.toBeInstanceOf(InvalidImageCropError);

    expect(context.exportStorage.keys()).toHaveLength(0);
  });

  it("should size a phone photo as it is seen, turned upright", async () => {
    const { context, rendered } = services();
    const project = await createProject(context, {
      ownerId: owner,
      name: "Foto",
    });
    const asset = createAsset({
      id: "aaaaaaaa-0000-4000-8000-000000000099",
      projectId: project.id,
      kind: "ORIGINAL_IMAGE",
      mimeType: "image/jpeg",
      byteSize: 64,
      originalName: "foto.jpg",
      now: new Date(Date.UTC(2026, 8, 21)),
    });

    await context.assets.save(asset, owner);
    // Guardada apaisada, 4000 × 3000, con la orden de girarla un cuarto.
    await context.assetStorage.put({
      key: asset.storageKey,
      contentType: asset.mimeType,
      bytes: jpegHeader(4000, 3000, 6),
    });

    const generated = await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 600 },
      // El recorte llega en pixels de la foto ya girada: 3000 de ancho.
      crop: { x: 0, y: 0, width: 3000, height: 4000 },
    });

    expect(generated.height).toBeCloseTo(800, 6);
    expect(rendered[0].sections[0].artwork?.image.orientation).toBe(6);
  });

  it("should charge the daily limit before storing, and store nothing when it is spent", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);
    let charged = 0;

    await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 600 },
      consume: async () => {
        charged++;
      },
    });

    await expect(
      exportPoster(context, {
        projectId: project.id,
        userId: owner,
        assetId: asset.id,
        size: { width: 600 },
        consume: async () => {
          throw new Error("limit reached");
        },
      }),
    ).rejects.toThrow("limit reached");

    expect(charged).toBe(1);
    expect(context.exportStorage.keys()).toHaveLength(1);
  });

  it("should name the file after the project and its width", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    const generated = await exportPoster(context, {
      projectId: project.id,
      userId: owner,
      assetId: asset.id,
      size: { width: 626 },
    });

    expect(generated.fileName).toBe("Spiderman 4-63cm.pdf");
  });

  it("should refuse a size out of range and store nothing", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    await expect(
      exportPoster(context, {
        projectId: project.id,
        userId: owner,
        assetId: asset.id,
        size: { width: 5000 },
      }),
    ).rejects.toBeInstanceOf(InvalidPosterSizeError);

    expect(context.exportStorage.keys()).toHaveLength(0);
  });

  it("should not print an image of another project", async () => {
    const { context } = services();
    const { asset } = await projectWithImage(context, "Uno");
    const other = await createProject(context, {
      ownerId: owner,
      name: "Otro",
    });

    // Las dos son del mismo usuario, pero la ruta es la de otro proyecto.
    await expect(
      exportPoster(context, {
        projectId: other.id,
        userId: owner,
        assetId: asset.id,
        size: { width: 600 },
      }),
    ).rejects.toBeInstanceOf(AssetNotFoundError);
  });

  it("should not print anything for somebody else", async () => {
    const { context } = services();
    const { project, asset } = await projectWithImage(context);

    await expect(
      exportPoster(context, {
        projectId: project.id,
        userId: stranger,
        assetId: asset.id,
        size: { width: 600 },
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
