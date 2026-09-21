import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readSupabaseConfiguration } from "@/infrastructure/supabase/environment";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import {
  createProject,
  type Project,
  type UserId,
} from "@/modules/projects/project";

import { SupabaseProjectRepository } from "./supabase-project-repository";

/**
 * Comprobación contra la base de datos real.
 *
 * El contrato del repositorio (`project-repository.contract.ts`) no sirve
 * aquí: guarda proyectos de varios dueños, y RLS —con razón— solo deja
 * escribir los del usuario autenticado. Lo que se comprueba aquí es
 * justamente eso, que es lo que ninguna prueba en memoria puede demostrar.
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

describe.skipIf(!configured)("Supabase project repository", () => {
  let repository: SupabaseProjectRepository;
  let userId: UserId;
  const created: string[] = [];

  beforeAll(async () => {
    const configuration = readSupabaseConfiguration();

    const client = createClient(configuration.url, configuration.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    userId = await new SupabaseAuthGateway(client).signIn({
      email: email as string,
      password: password as string,
    });

    repository = new SupabaseProjectRepository(client);
  });

  afterAll(async () => {
    // La base de datos es del usuario: no se deja basura.
    for (const id of created) {
      await repository.delete(id, userId);
    }
  });

  function project(name: string): Project {
    const built = createProject({
      id: crypto.randomUUID(),
      ownerId: userId,
      name,
      now: new Date(),
    });

    created.push(built.id);

    return built;
  }

  it("should sign in and identify the user", () => {
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should store and read back a project", async () => {
    const saved = project("Integración");

    await repository.save(saved);

    const found = await repository.findById(saved.id, userId);

    expect(found?.name).toBe("Integración");
    expect(found?.status).toBe("DRAFT");
    expect(found?.ownerId).toBe(userId);
  });

  it("should keep the dates it was given", async () => {
    const saved = project("Fechas");

    await repository.save(saved);

    const found = await repository.findById(saved.id, userId);

    expect(found?.createdAt.toISOString()).toBe(saved.createdAt.toISOString());
  });

  it("should list the projects of the user", async () => {
    const saved = project("Listado");

    await repository.save(saved);

    const listed = await repository.listByOwner(userId);

    expect(listed.some((found) => found.id === saved.id)).toBe(true);
  });

  it("should refuse to store a project for somebody else", async () => {
    // `with check` de la política: sin esto, un usuario podría crear
    // proyectos a nombre de otro. Ver AC-15.
    const stolen = {
      ...project("Ajeno"),
      ownerId: "00000000-0000-4000-8000-000000000000",
    };

    await expect(repository.save(stolen)).rejects.toThrow();
  });

  it("should not return a project to a different user", async () => {
    const saved = project("Privado");

    await repository.save(saved);

    expect(
      await repository.findById(
        saved.id,
        "00000000-0000-4000-8000-000000000000",
      ),
    ).toBeNull();
  });

  it("should delete a project of the user", async () => {
    const saved = project("Borrado");

    await repository.save(saved);
    await repository.delete(saved.id, userId);

    expect(await repository.findById(saved.id, userId)).toBeNull();
  });
});
