import { describe, expect, it } from "vitest";

import {
  createDataAuthorization,
  DATA_POLICY_VERSION,
} from "./data-authorization";
import { DataAuthorizationRequiredError } from "./errors";

const now = new Date("2026-09-21T15:00:00Z");

describe("Data authorization", () => {
  it("should record which policy was accepted and when", () => {
    expect(createDataAuthorization(true, now)).toEqual({
      policyVersion: DATA_POLICY_VERSION,
      acceptedAt: now,
    });
  });

  it("should accept only an explicit yes", () => {
    for (const value of [undefined, false, "true", 1, null, "on"]) {
      expect(() => createDataAuthorization(value, now)).toThrow(
        DataAuthorizationRequiredError,
      );
    }
  });
});
