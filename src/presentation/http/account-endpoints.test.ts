import { describe, expect, it } from "vitest";

import type { AccountServices } from "@/application/delete-account";
import { createProject } from "@/application/manage-projects";
import { DATA_POLICY_VERSION } from "@/modules/accounts/data-authorization";
import { InMemoryDataAuthorizationStore } from "@/modules/accounts/data-authorization-store";
import { InMemoryAssetRepository } from "@/modules/assets/in-memory-asset-repository";
import { InMemoryExportRepository } from "@/modules/exports/in-memory-export-repository";
import { InMemoryProjectRepository } from "@/modules/projects/in-memory-project-repository";
import { InMemoryObjectStorage } from "@/modules/storage/in-memory-object-storage";

import {
  handleAcceptDataPolicy,
  handleDeleteAccount,
  handleDeleteProject,
} from "./account-endpoints";

const owner = "11111111-1111-1111-1111-111111111111";
const stranger = "22222222-2222-2222-2222-222222222222";

function services(): AccountServices & { deleted: () => number } {
  const projects = new InMemoryProjectRepository();
  let sequence = 0;
  let deleted = 0;

  return {
    repository: projects,
    assets: new InMemoryAssetRepository(projects),
    exports: new InMemoryExportRepository(projects),
    assetStorage: new InMemoryObjectStorage(),
    exportStorage: new InMemoryObjectStorage(),
    accounts: {
      deleteCurrentAccount: async () => {
        deleted++;
      },
    },
    now: () => new Date(Date.UTC(2026, 8, 21, 10, ++sequence)),
    newId: () => `aaaaaaaa-0000-4000-8000-00000000000${++sequence}`,
    deleted: () => deleted,
  };
}

function remove(body: unknown): Request {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("Delete project endpoint", () => {
  it("should delete a project of the user", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleDeleteProject(project.id, {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(204);
    expect(await shared.repository.listByOwner(owner)).toHaveLength(0);
  });

  it("should not delete a project of somebody else", async () => {
    const shared = services();
    const project = await createProject(shared, {
      ownerId: owner,
      name: "Elefante",
    });

    const response = await handleDeleteProject(project.id, {
      services: shared,
      userId: stranger,
    });

    expect(response.status).toBe(404);
    expect(await shared.repository.listByOwner(owner)).toHaveLength(1);
  });

  it("should answer 401 without a session", async () => {
    const response = await handleDeleteProject("x", {
      services: services(),
      userId: null,
    });

    expect(response.status).toBe(401);
  });
});

describe("Delete account endpoint", () => {
  it("should delete the account when confirmed", async () => {
    const shared = services();

    await createProject(shared, { ownerId: owner, name: "Elefante" });

    const response = await handleDeleteAccount(remove({ confirm: true }), {
      services: shared,
      userId: owner,
    });

    expect(response.status).toBe(204);
    expect(shared.deleted()).toBe(1);
    expect(await shared.repository.listByOwner(owner)).toHaveLength(0);
  });

  it("should delete nothing without an explicit confirmation", async () => {
    for (const body of [{}, { confirm: "true" }, { confirm: 1 }]) {
      const shared = services();

      await createProject(shared, { ownerId: owner, name: "Elefante" });

      const response = await handleDeleteAccount(remove(body), {
        services: shared,
        userId: owner,
      });

      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe(
        "ACCOUNT_DELETION_NOT_CONFIRMED",
      );
      expect(shared.deleted()).toBe(0);
      expect(await shared.repository.listByOwner(owner)).toHaveLength(1);
    }
  });

  it("should answer 401 without a session", async () => {
    const response = await handleDeleteAccount(remove({ confirm: true }), {
      services: services(),
      userId: null,
    });

    expect(response.status).toBe(401);
  });
});

describe("Accept data policy endpoint", () => {
  function accept(body: unknown): Request {
    return new Request("http://localhost/api/account/data-authorization", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  function authorizations() {
    const store = new InMemoryDataAuthorizationStore();

    return {
      store,
      services: { authorizations: store, now: () => new Date() },
    };
  }

  it("should record the current policy for the signed-in account", async () => {
    const { store, services } = authorizations();

    const response = await handleAcceptDataPolicy(
      accept({ acceptedDataPolicy: true }),
      { services, userId: owner },
    );

    expect(response.status).toBe(204);
    expect(await store.hasAccepted(owner, DATA_POLICY_VERSION)).toBe(true);
  });

  it("should record nothing without an explicit yes", async () => {
    const { store, services } = authorizations();

    const response = await handleAcceptDataPolicy(accept({}), {
      services,
      userId: owner,
    });

    expect(response.status).toBe(400);
    expect(await store.hasAccepted(owner, DATA_POLICY_VERSION)).toBe(false);
  });

  it("should answer 401 without a session", async () => {
    const response = await handleAcceptDataPolicy(
      accept({ acceptedDataPolicy: true }),
      { services: authorizations().services, userId: null },
    );

    expect(response.status).toBe(401);
  });
});
