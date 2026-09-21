import { describe, expect, it } from "vitest";

import { AssetNotFoundError } from "@/modules/assets/errors";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import {
  InvalidImageDimensionsError,
  UnsupportedImageFormatError,
  UnsupportedImageOrientationError,
} from "@/modules/image-processing/errors";
import {
  jpegHeader,
  pngHeader,
} from "@/modules/image-processing/image-header.fixtures";
import { IMAGE_LIMITS } from "@/modules/image-processing/image-validation";
import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";

import { createProject } from "./manage-projects";
import {
  type AssetServices,
  deleteProjectImage,
  listProjectImages,
  uploadProjectImage,
} from "./upload-project-image";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): AssetServices & { storage: InMemoryObjectStorage } {
  const projects = new InMemoryProjectRepository();
  const storage = new InMemoryObjectStorage();

  let clock = 0;
  let projectSequence = 0;
  let assetSequence = 0;

  return {
    repository: projects,
    assets: new InMemoryAssetRepository(projects),
    storage,
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++projectSequence}`,
    newAssetId: () => `aaaaaaaa-0000-4000-8000-00000000000${++assetSequence}`,
  };
}

const png = { fileName: "elefante.png", mimeType: "image/png" };
const bytes = pngHeader();

async function projectOf(context: AssetServices) {
  return createProject(context, { ownerId: owner, name: "Elefante" });
}

describe("Upload a project image", () => {
  it("should store the original image of the project", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    expect(asset.kind).toBe("ORIGINAL_IMAGE");
    expect(asset.byteSize).toBe(bytes.byteLength);
    expect(context.storage.keys()).toEqual([asset.storageKey]);
  });

  it("should organise the file by project, never by its name", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      fileName: "mickey-final-final-2.png",
      mimeType: "image/png",
      bytes,
    });

    // El nombre del usuario es metadato, no ruta. Ver storage.md §42.
    expect(asset.storageKey).toBe(
      `projects/${project.id}/assets/${asset.id}/original.png`,
    );
    expect(asset.originalName).toBe("mickey-final-final-2.png");
  });

  it("should keep the original when another image is uploaded", async () => {
    const context = services();
    const project = await projectOf(context);

    const first = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });
    const second = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    // El original es inmutable: subir otra crea un asset nuevo.
    expect(second.id).not.toBe(first.id);
    expect(context.storage.keys()).toHaveLength(2);
  });

  it("should refuse to upload into a project of somebody else", async () => {
    const context = services();
    const project = await projectOf(context);

    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: stranger,
        ...png,
        bytes,
      }),
    ).rejects.toThrow(ProjectNotFoundError);

    expect(context.storage.keys()).toHaveLength(0);
  });

  it("should refuse a format it cannot read", async () => {
    const context = services();
    const project = await projectOf(context);

    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        fileName: "dibujo.svg",
        mimeType: "image/svg+xml",
        bytes,
      }),
    ).rejects.toThrow(UnsupportedImageFormatError);

    expect(context.storage.keys()).toHaveLength(0);
  });

  it("should refuse a file bigger than the limit", async () => {
    const context = services();
    const project = await projectOf(context);

    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        ...png,
        bytes: new Uint8Array(IMAGE_LIMITS.maxFileBytes + 1),
      }),
    ).rejects.toThrow();

    expect(context.storage.keys()).toHaveLength(0);
  });

  it("should not leave the file behind when the record cannot be saved", async () => {
    const context = services();
    const project = await projectOf(context);

    context.assets.save = async () => {
      throw new Error("la base de datos falló");
    };

    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        ...png,
        bytes,
      }),
    ).rejects.toThrow();

    // Sin la limpieza quedaría un archivo que nadie referencia.
    expect(context.storage.keys()).toHaveLength(0);
  });
});

describe("List project images", () => {
  it("should give a temporary url for each image", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    const listed = await listProjectImages(context, project.id, owner);

    expect(listed).toHaveLength(1);
    expect(listed[0].asset.id).toBe(asset.id);
    expect(listed[0].url).toContain(asset.storageKey);
  });

  it("should not list the images of a project of somebody else", async () => {
    const context = services();
    const project = await projectOf(context);

    await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    await expect(
      listProjectImages(context, project.id, stranger),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});

describe("Delete a project image", () => {
  it("should remove the record and the file", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    await deleteProjectImage(context, asset.id, owner);

    expect(await listProjectImages(context, project.id, owner)).toHaveLength(0);
    expect(context.storage.keys()).toHaveLength(0);
  });

  it("should not delete an image of somebody else", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      ...png,
      bytes,
    });

    await expect(
      deleteProjectImage(context, asset.id, stranger),
    ).rejects.toThrow(AssetNotFoundError);

    expect(context.storage.keys()).toHaveLength(1);
  });
});

describe("Upload a project image by what it really is", () => {
  it("should refuse a file whose content is not what it declares", async () => {
    const context = services();
    const project = await projectOf(context);

    // Nombre y tipo dicen PNG; los bytes son un JPEG. Lo que manda es la
    // cabecera. Ver docs/storage.md §122.
    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        ...png,
        bytes: jpegHeader(),
      }),
    ).rejects.toBeInstanceOf(UnsupportedImageFormatError);

    expect(context.storage.keys()).toHaveLength(0);
  });

  it("should refuse a file that is not an image at all", async () => {
    const context = services();
    const project = await projectOf(context);

    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        ...png,
        bytes: new TextEncoder().encode("%PDF-1.7 esto no es una imagen"),
      }),
    ).rejects.toBeInstanceOf(UnsupportedImageFormatError);
  });

  it("should refuse an image too small to become a large figure", async () => {
    const context = services();
    const project = await projectOf(context);

    // Los límites de dimensiones esperaban a un decodificador; la cabecera
    // basta. Ver docs/storage.md §150.
    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        ...png,
        bytes: pngHeader(50, 50),
      }),
    ).rejects.toBeInstanceOf(InvalidImageDimensionsError);
  });

  it("should refuse a photo rotated by the camera", async () => {
    const context = services();
    const project = await projectOf(context);

    // El navegador la enseñaría derecha y el PDF saldría girado.
    await expect(
      uploadProjectImage(context, {
        projectId: project.id,
        userId: owner,
        fileName: "foto.jpg",
        mimeType: "image/jpeg",
        bytes: jpegHeader(4000, 3000, 6),
      }),
    ).rejects.toBeInstanceOf(UnsupportedImageOrientationError);
  });

  it("should accept a photo that needs no rotation", async () => {
    const context = services();
    const project = await projectOf(context);

    const asset = await uploadProjectImage(context, {
      projectId: project.id,
      userId: owner,
      fileName: "foto.jpg",
      mimeType: "image/jpeg",
      bytes: jpegHeader(720, 894, 1),
    });

    expect(asset.mimeType).toBe("image/jpeg");
  });
});
