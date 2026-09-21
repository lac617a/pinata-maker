import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readSupabaseConfiguration } from "@/infrastructure/supabase/environment";
import {
  PROJECT_ASSETS_BUCKET,
  SupabaseObjectStorage,
} from "@/infrastructure/supabase/supabase-object-storage";
import { SupabaseAuthGateway } from "@/modules/accounts/infrastructure/supabase-auth-gateway";
import { type Asset, createAsset } from "@/modules/assets/asset";
import { SupabaseProjectRepository } from "@/modules/projects/infrastructure/supabase-project-repository";
import {
  createProject,
  type Project,
  type UserId,
} from "@/modules/projects/project";

import { SupabaseAssetRepository } from "./supabase-asset-repository";

/**
 * Comprobación contra la base de datos y el object storage reales.
 *
 * Lo que se verifica aquí no puede verificarse en memoria: que la propiedad
 * **transitiva** de la migración 0002 funciona —el asset es del dueño de su
 * proyecto— y que el bucket es privado de verdad.
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

describe.skipIf(!configured)("Supabase asset repository", () => {
  let client: SupabaseClient;
  let projects: SupabaseProjectRepository;
  let assets: SupabaseAssetRepository;
  let storage: SupabaseObjectStorage;
  let userId: UserId;
  let project: Project;
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
    assets = new SupabaseAssetRepository(client);
    storage = new SupabaseObjectStorage(client, PROJECT_ASSETS_BUCKET);

    project = createProject({
      id: crypto.randomUUID(),
      ownerId: userId,
      name: "Assets de integración",
      now: new Date(),
    });

    await projects.save(project);
  });

  afterAll(async () => {
    for (const key of storedKeys) {
      await storage.remove(key).catch(() => undefined);
    }

    // Borrar el proyecto arrastra sus assets: la clave foránea es en cascada.
    await projects.delete(project.id, userId);
  });

  function asset(originalName: string): Asset {
    return createAsset({
      id: crypto.randomUUID(),
      projectId: project.id,
      kind: "ORIGINAL_IMAGE",
      mimeType: "image/png",
      byteSize: 4,
      originalName,
      now: new Date(),
    });
  }

  it("should store and read back an asset of the user's project", async () => {
    const saved = asset("integracion.png");

    await assets.save(saved, userId);

    const found = await assets.findById(saved.id, userId);

    expect(found?.originalName).toBe("integracion.png");
    expect(found?.storageKey).toBe(saved.storageKey);
    expect(found?.byteSize).toBe(4);
  });

  it("should list the assets of the project", async () => {
    const saved = asset("listado.png");

    await assets.save(saved, userId);

    const listed = await assets.listByProject(project.id, userId);

    expect(listed.some((found) => found.id === saved.id)).toBe(true);
  });

  it("should refuse to store an asset in a project of somebody else", async () => {
    // La política comprueba el dueño del proyecto referenciado. Sin ella, un
    // usuario podría colgar archivos del proyecto de otro. Ver AC-15.
    const intruder = {
      ...asset("ajeno.png"),
      projectId: "00000000-0000-4000-8000-000000000000",
    };

    await expect(assets.save(intruder, userId)).rejects.toThrow();
  });

  it("should delete an asset of the user", async () => {
    const saved = asset("borrado.png");

    await assets.save(saved, userId);
    await assets.delete(saved.id, userId);

    expect(await assets.findById(saved.id, userId)).toBeNull();
  });

  it("should store a file and sign a temporary link for it", async () => {
    const saved = asset("archivo.png");

    await storage.put({
      key: saved.storageKey,
      contentType: saved.mimeType,
      bytes: Uint8Array.from([1, 2, 3, 4]),
    });
    storedKeys.push(saved.storageKey);

    const url = await storage.createSignedUrl(saved.storageKey, 60);

    expect(url).toContain(saved.storageKey);
    expect(url).toContain("token=");
  });

  it("should not serve the file without a signature", async () => {
    const saved = asset("privado.png");

    await storage.put({
      key: saved.storageKey,
      contentType: saved.mimeType,
      bytes: Uint8Array.from([5, 6, 7, 8]),
    });
    storedKeys.push(saved.storageKey);

    const configuration = readSupabaseConfiguration();

    // El bucket es privado: la URL pública existe como cadena, pero no sirve
    // el archivo. Ver docs/PRD.md §26.
    const response = await fetch(
      `${configuration.url}/storage/v1/object/public/project-assets/${saved.storageKey}`,
    );

    expect(response.ok).toBe(false);
  });
});
