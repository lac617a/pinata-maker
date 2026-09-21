import { describe, expect, it } from "vitest";

import { InMemoryDataAuthorizationStore } from "@/modules/accounts/data-authorization-store";
import { DataAuthorizationRequiredError } from "@/modules/accounts/errors";

import {
  acceptDataPolicy,
  type DataAuthorizationServices,
  needsDataAuthorization,
} from "./data-authorization";

const user = "11111111-1111-1111-1111-111111111111";

function services(): DataAuthorizationServices {
  return {
    authorizations: new InMemoryDataAuthorizationStore(),
    now: () => new Date("2026-09-21T15:00:00Z"),
  };
}

describe("Data authorization of an existing account", () => {
  it("should ask an account that never accepted the current policy", async () => {
    expect(await needsDataAuthorization(services(), user)).toBe(true);
  });

  it("should stop asking once it is accepted", async () => {
    const context = services();

    await acceptDataPolicy(context, user, true);

    expect(await needsDataAuthorization(context, user)).toBe(false);
  });

  it("should record nothing without an explicit yes", async () => {
    const context = services();

    await expect(
      acceptDataPolicy(context, user, "true"),
    ).rejects.toBeInstanceOf(DataAuthorizationRequiredError);
    expect(await needsDataAuthorization(context, user)).toBe(true);
  });

  it("should ask again when the accepted version is not the current one", async () => {
    const context = services();

    await context.authorizations.record(user, "2020-01-01");

    expect(await needsDataAuthorization(context, user)).toBe(true);
  });
});
