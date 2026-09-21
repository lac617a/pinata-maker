import { describe, expect, it } from "vitest";

import {
  MissingUsageConfigurationError,
  readUsageSecret,
  USAGE_SECRET_VARIABLE,
} from "./environment";

describe("Usage environment", () => {
  it("should read a long enough secret", () => {
    const secret = "x".repeat(32);

    expect(readUsageSecret({ [USAGE_SECRET_VARIABLE]: secret })).toBe(secret);
  });

  it("should refuse a missing or short secret without showing it", () => {
    for (const value of [undefined, "", "short-secret"]) {
      const read = () => readUsageSecret({ [USAGE_SECRET_VARIABLE]: value });

      expect(read).toThrow(MissingUsageConfigurationError);
      if (value) {
        expect(read).not.toThrow(value);
      }
    }
  });
});
