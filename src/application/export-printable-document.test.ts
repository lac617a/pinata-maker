import { describe, expect, it } from "vitest";

import { createAsset } from "@/modules/assets/asset";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import { ExportNotFoundError } from "@/modules/exports/errors";
import { InMemoryExportRepository } from "@/modules/exports/in-memory-export-repository";
import { JsPdfPrintRenderer } from "@/modules/pdf-generation/infrastructure/jspdf-print-renderer";
import type {
  PrintableDocument,
  PrintDocument,
  PrintRenderer,
  PrintRenderOptions,
} from "@/modules/pdf-generation/print-renderer";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
  PDF_GENERATOR_VERSION,
  sanitizePdfFileName,
} from "@/modules/pdf-generation/print-renderer";
import { uniformMargins } from "@/modules/printing/margins";
import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";
import { ProjectNotFoundError } from "@/modules/projects/errors";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";
import { ObjectStorageError } from "@/modules/storage/object-storage";
import { TemplateVersionNotFoundError } from "@/modules/templates/errors";
import { InMemoryTemplateVersionRepository } from "@/modules/templates/in-memory-template-version-repository";
import { squareTemplate } from "@/modules/templates/template-version-repository.contract";

import {
  deleteProjectExport,
  downloadExport,
  type ExportServices,
  exportTemplateVersion,
  listProjectExports,
} from "./export-printable-document";
import { createProject } from "./manage-projects";
import { publishTemplateVersion } from "./manage-template-versions";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

/**
 * Renderer de mentira.
 *
 * El caso de uso no genera el PDF: encadena el dominio con el renderer y
 * guarda el resultado. Probarlo contra jsPDF sería probar jsPDF.
 */
class FakeRenderer implements PrintRenderer {
  rendered: PrintDocument[] = [];

  async render(
    document: PrintDocument,
    options: PrintRenderOptions = {},
  ): Promise<PrintableDocument> {
    this.rendered.push(document);

    return {
      fileName: sanitizePdfFileName(options.fileName ?? "documento.pdf"),
      contentType: PDF_CONTENT_TYPE,
      pageCount: documentPageCount(document),
      bytes: Uint8Array.from([37, 80, 68, 70]),
    };
  }
}

function services(): ExportServices & {
  exportStorage: InMemoryObjectStorage;
  renderer: FakeRenderer;
} {
  const projects = new InMemoryProjectRepository();
  const exportStorage = new InMemoryObjectStorage();
  const renderer = new FakeRenderer();

  let clock = 0;
  let sequence = 0;

  return {
    repository: projects,
    templateVersions: new InMemoryTemplateVersionRepository(projects),
    exports: new InMemoryExportRepository(projects),
    assets: new InMemoryAssetRepository(projects),
    assetStorage: new InMemoryObjectStorage(),
    exportStorage,
    renderer,
    now: () => new Date(Date.UTC(2026, 0, 1, 10, ++clock)),
    newId: () => `pppppppp-0000-4000-8000-00000000000${++sequence}`,
    newTemplateVersionId: () =>
      `tttttttt-0000-4000-8000-00000000000${++sequence}`,
    newExportId: () => `eeeeeeee-0000-4000-8000-00000000000${++sequence}`,
  };
}

async function publishedVersion(context: ExportServices, ownerId = owner) {
  const project = await createProject(context, {
    ownerId,
    name: "Elefante",
  });

  const version = await publishTemplateVersion(context, {
    projectId: project.id,
    userId: ownerId,
    template: squareTemplate("Elefante"),
  });

  return { project, version };
}

describe("Export printable document", () => {
  it("should store the generated document", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    expect(generated.byteSize).toBe(4);
    expect(generated.contentType).toBe(PDF_CONTENT_TYPE);
    expect(context.exportStorage.keys()).toEqual([generated.storageKey]);
  });

  it("should record which version the document came from", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    // Es lo que relaciona un PDF impreso con su molde. Ver §53 y §54.
    expect(generated.templateVersionId).toBe(version.id);
    expect(generated.generatorVersion).toBe(PDF_GENERATOR_VERSION);
  });

  it("should record the paper the document was laid out on", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
      print: {
        ...DEFAULT_PRINT_CONFIGURATION,
        paper: {
          format: "A3",
          orientation: "LANDSCAPE",
          margins: uniformMargins(5),
        },
      },
    });

    // El mismo molde en A3 apaisado no es el mismo documento.
    expect(generated.paperFormat).toBe("A3");
    expect(generated.paperOrientation).toBe("LANDSCAPE");
  });

  it("should name the file after the template and its version", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    expect(generated.fileName).toBe("Elefante-v1.pdf");
  });

  it("should keep the earlier document when the template is exported again", async () => {
    const context = services();
    const { project, version } = await publishedVersion(context);

    const first = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    const second = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    // Cada generación es un artefacto propio, con su archivo. Ver §55.
    expect(second.id).not.toBe(first.id);
    expect(context.exportStorage.keys()).toHaveLength(2);
    expect(await listProjectExports(context, project.id, owner)).toHaveLength(
      2,
    );
  });

  it("should include the cover sheet in the page count", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    // Una pieza de 100 × 100 mm cabe en una hoja A4, más la de
    // instrucciones. Ver docs/PRD.md §19.
    expect(generated.pageCount).toBe(2);
  });

  it("should not leave the file behind when the row cannot be stored", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const failing: ExportServices = {
      ...context,
      exports: {
        ...context.exports,
        create: async () => {
          throw new Error("la base de datos no responde");
        },
        findById: context.exports.findById.bind(context.exports),
        listByProject: context.exports.listByProject.bind(context.exports),
        delete: context.exports.delete.bind(context.exports),
      },
    };

    await expect(
      exportTemplateVersion(failing, {
        templateVersionId: version.id,
        userId: owner,
      }),
    ).rejects.toThrow();

    // Un archivo que nadie referencia ocuparía espacio para siempre.
    expect(context.exportStorage.keys()).toHaveLength(0);
  });

  it("should hand out a temporary link to download the document", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    const downloadable = await downloadExport(context, generated.id, owner);

    expect(downloadable.url).toContain(generated.storageKey);
    expect(downloadable.export.fileName).toBe(generated.fileName);
  });

  it("should hand out a link that downloads under the document name", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    const downloadable = await downloadExport(context, generated.id, owner);

    // Descargar y no abrir: el usuario no sale de la página y el navegador no
    // bloquea una ventana abierta después de esperar al PDF.
    expect(downloadable.url).toContain(`download=${generated.fileName}`);
  });

  it("should not export a version of somebody else", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    await expect(
      exportTemplateVersion(context, {
        templateVersionId: version.id,
        userId: stranger,
      }),
    ).rejects.toBeInstanceOf(TemplateVersionNotFoundError);
  });

  it("should not export a version that belongs to another project", async () => {
    const context = services();
    const { version } = await publishedVersion(context);
    const other = await createProject(context, {
      ownerId: owner,
      name: "Otro",
    });

    await expect(
      exportTemplateVersion(context, {
        templateVersionId: version.id,
        userId: owner,
        projectId: other.id,
      }),
    ).rejects.toBeInstanceOf(TemplateVersionNotFoundError);
  });

  it("should not download a document of somebody else", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    await expect(
      downloadExport(context, generated.id, stranger),
    ).rejects.toBeInstanceOf(ExportNotFoundError);
  });

  it("should not list the documents of a project of somebody else", async () => {
    const context = services();
    const { project } = await publishedVersion(context);

    await expect(
      listProjectExports(context, project.id, stranger),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("should remove the file when the document is deleted", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    await deleteProjectExport(context, generated.id, owner);

    expect(context.exportStorage.keys()).toHaveLength(0);
    await expect(
      downloadExport(context, generated.id, owner),
    ).rejects.toBeInstanceOf(ExportNotFoundError);
  });

  it("should not delete a document of somebody else", async () => {
    const context = services();
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    await expect(
      deleteProjectExport(context, generated.id, stranger),
    ).rejects.toBeInstanceOf(ExportNotFoundError);

    expect(context.exportStorage.keys()).toHaveLength(1);
  });

  /**
   * Con el renderer de verdad.
   *
   * El resto de la suite usa uno de mentira porque lo que se prueba es la
   * orquestación. Esto comprueba lo otro: que la cadena entera —versión
   * guardada, PDF real, archivo en almacenamiento, enlace de descarga— no se
   * rompe en la costura. Ver docs/roadmap.md §2.13.
   */
  it("should store a real PDF end to end", async () => {
    const context = { ...services(), renderer: new JsPdfPrintRenderer() };
    const { version } = await publishedVersion(context);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    const stored = context.exportStorage.read(generated.storageKey);
    const header = new TextDecoder().decode(stored?.bytes.slice(0, 5));

    expect(header).toBe("%PDF-");
    expect(generated.byteSize).toBe(stored?.bytes.byteLength);
    expect(generated.byteSize).toBeGreaterThan(1000);
  });
});

describe("Export printable document with the source image", () => {
  const withImage = {
    ...squareTemplate("Elefante"),
    referenceImage: { x: -10, y: -10, width: 120, height: 120 },
  };

  /** Proyecto con su imagen guardada y una versión que salió de ella. */
  async function projectWithImage(context: ReturnType<typeof services>) {
    const project = await createProject(context, {
      ownerId: owner,
      name: "Elefante",
    });

    const asset = createAsset({
      id: "aaaaaaaa-0000-4000-8000-0000000000a1",
      projectId: project.id,
      kind: "ORIGINAL_IMAGE",
      mimeType: "image/png",
      byteSize: 3,
      originalName: "elefante.png",
      now: new Date(Date.UTC(2026, 0, 1)),
    });

    await context.assets.save(asset, owner);
    await context.assetStorage.put({
      key: asset.storageKey,
      contentType: asset.mimeType,
      bytes: new Uint8Array([7, 8, 9]),
    });

    const version = await publishTemplateVersion(context, {
      projectId: project.id,
      userId: owner,
      template: withImage,
      sourceAssetId: asset.id,
    });

    return { project, asset, version };
  }

  it("should draw the stored image inside the faces", async () => {
    const context = services();
    const { version } = await projectWithImage(context);

    await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    const [document] = context.renderer.rendered;
    const front = document.sections.find((section) =>
      section.label.startsWith("FRONT"),
    );

    // Lo que se dibuja son los bytes guardados, no lo que tuviera el
    // navegador: el documento sale de la versión.
    expect([...(front?.artwork?.image.bytes ?? [])]).toEqual([7, 8, 9]);
    expect(front?.artwork?.image.format).toBe("PNG");
  });

  it("should still export the contours when the image was deleted", async () => {
    const context = services();
    const { version, asset } = await projectWithImage(context);

    await context.assets.delete(asset.id, owner);

    const generated = await exportTemplateVersion(context, {
      templateVersionId: version.id,
      userId: owner,
    });

    // El molde sigue siendo válido sin su decoración.
    expect(generated.pageCount).toBeGreaterThan(0);
    expect(
      context.renderer.rendered[0].sections.every(
        (section) => section.artwork === undefined,
      ),
    ).toBe(true);
  });

  it("should fail instead of silently dropping an image it cannot read", async () => {
    const context = services();
    const { version, asset } = await projectWithImage(context);

    await context.assetStorage.remove(asset.storageKey);

    // La fila existe y el archivo no: entregar el PDF sin la figura sería
    // un documento distinto del que se pidió, sin decirlo.
    await expect(
      exportTemplateVersion(context, {
        templateVersionId: version.id,
        userId: owner,
      }),
    ).rejects.toBeInstanceOf(ObjectStorageError);
  });
});
