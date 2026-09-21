import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readSupabaseConfiguration } from "@/infrastructure/supabase/environment";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import {
  createProject,
  type Project,
  type UserId,
} from "@/modules/projects/project";
import { TemplateVersionConflictError } from "@/modules/templates/errors";
import {
  createTemplateVersion,
  type TemplateVersion,
} from "@/modules/templates/template-version";
import { squareTemplate } from "@/modules/templates/template-version-repository.contract";

import { SupabaseTemplateVersionRepository } from "./supabase-template-version-repository";

/**
 * Comprobación contra la base de datos real.
 *
 * Aquí se verifica lo que ninguna prueba en memoria puede demostrar: que la
 * **inmutabilidad la impone la base de datos** y no el código que la usa.
 * Sin política de `update`, una versión publicada no se puede modificar
 * aunque alguien lo intente desde una ruta nueva.
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

describe.skipIf(!configured)("Supabase template version repository", () => {
  let client: SupabaseClient;
  let projects: SupabaseProjectRepository;
  let versions: SupabaseTemplateVersionRepository;
  let userId: UserId;
  let project: Project;

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
    versions = new SupabaseTemplateVersionRepository(client);

    project = createProject({
      id: crypto.randomUUID(),
      ownerId: userId,
      name: "Versiones de integración",
      now: new Date(),
    });

    await projects.save(project);
  });

  afterAll(async () => {
    // Borrar el proyecto arrastra sus versiones: la clave foránea es en
    // cascada y no pasa por RLS.
    await projects.delete(project.id, userId);
  });

  function version(versionNumber: number, name: string): TemplateVersion {
    return createTemplateVersion({
      id: crypto.randomUUID(),
      projectId: project.id,
      versionNumber,
      template: squareTemplate(name),
      now: new Date(),
    });
  }

  it("should store and read back a published version", async () => {
    const published = version(1, "Primera");

    await versions.create(published, userId);

    const found = await versions.findById(published.id, userId);

    expect(found?.versionNumber).toBe(1);
    expect(found?.name).toBe("Primera");
    expect(found?.definition).toEqual(published.definition);
  });

  it("should refuse a second version with the same number", async () => {
    // La restricción única es lo que impide que dos publicaciones a la vez
    // acaben compartiendo número. Ver docs/storage.md §21.
    await expect(
      versions.create(version(1, "Repetida"), userId),
    ).rejects.toBeInstanceOf(TemplateVersionConflictError);
  });

  it("should not let anyone modify a published version", async () => {
    const published = version(2, "Intocable");

    await versions.create(published, userId);

    // No hay política de UPDATE: la fila no se puede tocar. RLS no lo
    // convierte en un error, simplemente no encuentra ninguna fila que
    // actualizar. Lo que importa es que después sigue diciendo lo mismo.
    await client
      .from("template_versions")
      .update({ name: "Cambiada" })
      .eq("id", published.id);

    expect((await versions.findById(published.id, userId))?.name).toBe(
      "Intocable",
    );
  });

  it("should not let anyone delete a published version on its own", async () => {
    const published = version(3, "Permanente");

    await versions.create(published, userId);

    await client.from("template_versions").delete().eq("id", published.id);

    // Un export generado apunta a su versión: borrarla suelta dejaría el PDF
    // sin el molde que dice haber impreso. Ver docs/storage.md §55.
    expect(await versions.findById(published.id, userId)).not.toBeNull();
  });

  it("should list the versions of the project, newest first", async () => {
    const listed = await versions.listByProject(project.id, userId);

    expect(listed.map((found) => found.versionNumber)).toEqual([3, 2, 1]);
    expect(listed[0]).not.toHaveProperty("definition");
  });

  it("should report the latest version", async () => {
    expect((await versions.findLatest(project.id, userId))?.name).toBe(
      "Permanente",
    );
  });

  it("should refuse to publish into a project of somebody else", async () => {
    const intruder = {
      ...version(1, "Ajena"),
      projectId: "00000000-0000-4000-8000-000000000000",
    };

    await expect(versions.create(intruder, userId)).rejects.toThrow();
  });
});
