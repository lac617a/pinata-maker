import { describe, expect, it } from "vitest";

import {
  InvalidProjectError,
  InvalidProjectTransitionError,
} from "./errors";
import {
  createProject,
  projectBelongsTo,
  PROJECT_NAME_MAX_LENGTH,
  renameProject,
  transitionProject,
  type ProjectStatus,
} from "./project";

const now = new Date("2026-01-01T10:00:00Z");
const later = new Date("2026-01-02T10:00:00Z");

const project = createProject({
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  ownerId: "11111111-1111-1111-1111-111111111111",
  name: "Elefante",
  now,
});

describe("Project", () => {
  it("should start as a draft", () => {
    expect(project.status).toBe("DRAFT");
    expect(project.createdAt).toBe(now);
    expect(project.updatedAt).toBe(now);
  });

  it("should trim the name the user typed", () => {
    expect(createProject({ ...project, name: "  Unicornio  ", now }).name).toBe(
      "Unicornio",
    );
  });

  it("should refuse a project without a name", () => {
    expect(() => createProject({ ...project, name: "   ", now })).toThrow(
      InvalidProjectError,
    );
  });

  it("should refuse a name longer than the limit", () => {
    expect(() =>
      createProject({
        ...project,
        name: "a".repeat(PROJECT_NAME_MAX_LENGTH + 1),
        now,
      }),
    ).toThrow(InvalidProjectError);
  });

  it("should refuse a project without an owner", () => {
    expect(() => createProject({ ...project, ownerId: "", now })).toThrow(
      InvalidProjectError,
    );
  });

  it("should record when the name changed", () => {
    const renamed = renameProject(project, "Unicornio", later);

    expect(renamed.name).toBe("Unicornio");
    expect(renamed.updatedAt).toBe(later);
    expect(renamed.createdAt).toBe(now);
  });

  it("should follow the lifecycle of a project", () => {
    const processing = transitionProject(project, "PROCESSING", later);
    const ready = transitionProject(processing, "READY", later);

    expect(ready.status).toBe("READY");
    // Volver a procesar es legítimo: el usuario cambia la imagen o las
    // medidas.
    expect(transitionProject(ready, "PROCESSING", later).status).toBe(
      "PROCESSING",
    );
  });

  it("should allow retrying after a failure", () => {
    const failed = transitionProject(
      transitionProject(project, "PROCESSING", later),
      "ERROR",
      later,
    );

    expect(transitionProject(failed, "PROCESSING", later).status).toBe(
      "PROCESSING",
    );
  });

  it("should refuse a transition that does not exist", () => {
    // El estado describe una condición real, no una etiqueta que se pueda
    // fijar a voluntad. Ver PRD §22.
    const impossible: [ProjectStatus, ProjectStatus][] = [
      ["DRAFT", "READY"],
      ["DRAFT", "ERROR"],
      ["READY", "ERROR"],
    ];

    for (const [from, to] of impossible) {
      const current = { ...project, status: from };

      expect(() => transitionProject(current, to, later)).toThrow(
        InvalidProjectTransitionError,
      );
    }
  });

  it("should tell whose project it is", () => {
    expect(projectBelongsTo(project, project.ownerId)).toBe(true);
    expect(projectBelongsTo(project, "someone-else")).toBe(false);
  });
});
