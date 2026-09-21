import { describe, expect, it } from "vitest";

import { InvalidTemplateDefinitionError } from "./errors";
import { TEMPLATE_SCHEMA_VERSION } from "./template-definition";
import {
  createTemplateVersion,
  FIRST_VERSION_NUMBER,
  nextVersionNumber,
  summarizeTemplateVersion,
} from "./template-version";
import { squareTemplate } from "./template-version-repository.contract";

const project = "pppppppp-0000-4000-8000-000000000001";

function version(versionNumber = FIRST_VERSION_NUMBER) {
  return createTemplateVersion({
    id: "tttttttt-0000-4000-8000-000000000001",
    projectId: project,
    versionNumber,
    template: squareTemplate("Elefante"),
    now: new Date("2026-01-01T10:00:00Z"),
  });
}

describe("Template version", () => {
  it("should derive its metadata from the template it publishes", () => {
    const published = version();

    // El nombre y el recuento de piezas no los declara quien publica: se leen
    // de la plantilla, que es la fuente de verdad.
    expect(published.name).toBe("Elefante");
    expect(published.pieceCount).toBe(1);
    expect(published.width).toBe(100);
    expect(published.schemaVersion).toBe(TEMPLATE_SCHEMA_VERSION);
  });

  it("should start the numbering of a project at one", () => {
    expect(nextVersionNumber(null)).toBe(FIRST_VERSION_NUMBER);
  });

  it("should give the next number after the latest version", () => {
    expect(nextVersionNumber(summarizeTemplateVersion(version(7)))).toBe(8);
  });

  it("should refuse a version number below the first", () => {
    expect(() => version(0)).toThrow(InvalidTemplateDefinitionError);
  });

  it("should refuse a version number that is not whole", () => {
    expect(() => version(1.5)).toThrow(InvalidTemplateDefinitionError);
  });

  it("should refuse a version without a project", () => {
    expect(() =>
      createTemplateVersion({
        id: "tttttttt-0000-4000-8000-000000000001",
        projectId: "  ",
        versionNumber: 1,
        template: squareTemplate(),
        now: new Date("2026-01-01T10:00:00Z"),
      }),
    ).toThrow(InvalidTemplateDefinitionError);
  });

  it("should leave the geometry out of a summary", () => {
    const summary = summarizeTemplateVersion(version());

    expect(summary).not.toHaveProperty("definition");
    expect(summary.versionNumber).toBe(1);
  });

  it("should record no source image when none was given", () => {
    // Hoy la cadena de imagen a máscara no existe, así que una versión puede
    // no saber de dónde salió. Se guarda como `null` explícito.
    expect(version().sourceAssetId).toBeNull();
  });
});
