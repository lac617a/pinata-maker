import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readSupabaseConfiguration } from "@/infrastructure/supabase/environment";
import {
  PROJECT_EXPORTS_BUCKET,
  SupabaseObjectStorage,
} from "@/infrastructure/supabase/supabase-object-storage";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import {
  createProjectExport,
  type ProjectExport,
} from "@/modules/exports/export";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import {
  createProject,
  type Project,
  type UserId,
} from "@/modules/projects/project";
import { SupabaseTemplateVersionRepository } from "@/modules/templates/infrastructure/supabase-template-version-repository";
import { createTemplateVersion } from "@/modules/templates/template-version";
import { squareTemplate } from "@/modules/templates/template-version-repository.contract";

import { SupabaseExportRepository } from "./supabase-export-repository";

/**
 * Comprobación contra la base de datos y el object storage reales.
 *
 * Aquí se verifica lo que ninguna prueba en memoria puede demostrar: que un
 * export publicado no se puede modificar, que la versión de la que salió no
 * se puede borrar mientras exista, y que el bucket de documentos es privado.
 *
 * Las credenciales llegan del entorno y nunca del código:
 *
 * ```text
 * SUPABASE_TEST_EMAIL
 * SUPABASE_TEST_PASSWORD
 * ```
 *
 * Sin ellas la suite se salta. Ver docs/AGENTS.md §45.
 */

const email = process.env.SUPABASE_TEST_EMAIL;
const password = process.env.SUPABASE_TEST_PASSWORD;

const configured = Boolean(email && password);

describe.skipIf(!configured)("Supabase export repository", () => {
  let client: SupabaseClient;
  let projects: SupabaseProjectRepository;
  let exports: SupabaseExportRepository;
  let storage: SupabaseObjectStorage;
  let userId: UserId;
  let project: Project;
  let templateVersionId: string;
  const storedKeys: string[] = [];

  beforeAll(async () => {
    const configuration = readSupabaseConfiguration();

    client = createClient(configuration.url, configuration.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    userId = await new SupabaseAuthGateway(client).signIn({
      email: email as string,
      password: password as string,
    });

    projects = new SupabaseProjectRepository(client);
    exports = new SupabaseExportRepository(client);
    storage = new SupabaseObjectStorage(client, PROJECT_EXPORTS_BUCKET);

    project = createProject({
      id: crypto.randomUUID(),
      ownerId: userId,
      name: "Exports de integración",
      now: new Date(),
    });

    await projects.save(project);

    const version = createTemplateVersion({
      id: crypto.randomUUID(),
      projectId: project.id,
      versionNumber: 1,
      template: squareTemplate("Elefante"),
      now: new Date(),
    });

    await new SupabaseTemplateVersionRepository(client).create(version, userId);

    templateVersionId = version.id;
  });

  afterAll(async () => {
    for (const key of storedKeys) {
      await storage.remove(key).catch(() => undefined);
    }

    // Borrar el proyecto arrastra versiones y exports a la vez.
    await projects.delete(project.id, userId);
  });

  function generated(fileName: string): ProjectExport {
    return createProjectExport({
      id: crypto.randomUUID(),
      projectId: project.id,
      templateVersionId,
      fileName,
      contentType: "application/pdf",
      pageCount: 2,
      byteSize: 4,
      paperFormat: "A4",
      paperOrientation: "PORTRAIT",
      generatorVersion: "1.0",
      now: new Date(),
    });
  }

  it("should store and read back a generated document", async () => {
    const saved = generated("integracion.pdf");

    await exports.create(saved, userId);

    const found = await exports.findById(saved.id, userId);

    expect(found?.fileName).toBe("integracion.pdf");
    expect(found?.templateVersionId).toBe(templateVersionId);
    expect(found?.paperFormat).toBe("A4");
  });

  it("should not let anyone modify a generated document", async () => {
    const saved = generated("intocable.pdf");

    await exports.create(saved, userId);

    // No hay política de UPDATE: un artefacto generado no se corrige, se
    // vuelve a generar. Ver docs/storage.md §55.
    await client
      .from("exports")
      .update({ file_name: "cambiado.pdf" })
      .eq("id", saved.id);

    expect((await exports.findById(saved.id, userId))?.fileName).toBe(
      "intocable.pdf",
    );
  });

  it("should not let the version be deleted while a document points at it", async () => {
    // `on delete restrict`: el PDF que el usuario imprimió tiene que seguir
    // pudiendo decir de qué molde salió.
    const { error } = await client
      .from("template_versions")
      .delete()
      .eq("id", templateVersionId);

    expect(error).not.toBeNull();
  });

  it("should delete a document of the user", async () => {
    const saved = generated("borrado.pdf");

    await exports.create(saved, userId);
    await exports.delete(saved.id, userId);

    expect(await exports.findById(saved.id, userId)).toBeNull();
  });

  it("should refuse to store a document in a project of somebody else", async () => {
    const intruder = {
      ...generated("ajeno.pdf"),
      projectId: "00000000-0000-4000-8000-000000000000",
    };

    await expect(exports.create(intruder, userId)).rejects.toThrow();
  });

  it("should not serve the document without a signature", async () => {
    const saved = generated("privado.pdf");

    await storage.put({
      key: saved.storageKey,
      contentType: saved.contentType,
      bytes: Uint8Array.from([37, 80, 68, 70]),
    });
    storedKeys.push(saved.storageKey);

    const signed = await storage.createSignedUrl(saved.storageKey, 60);

    expect(signed).toContain("token=");

    const configuration = readSupabaseConfiguration();

    const response = await fetch(
      `${configuration.url}/storage/v1/object/public/${PROJECT_EXPORTS_BUCKET}/${saved.storageKey}`,
    );

    expect(response.ok).toBe(false);
  });
});
