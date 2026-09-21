import { describe, expect, it } from "vitest";

import { InvalidUsageLimitsError } from "./errors";
import {
  DEFAULT_USAGE_LIMITS,
  nextUsageReset,
  readUsageLimits,
  usageDay,
  usageStatus,
} from "./usage";

describe("Usage limits", () => {
  it("should use the product defaults when nothing is configured", () => {
    expect(readUsageLimits({})).toEqual({
      ANONYMOUS: 3,
      REGISTERED: 20,
      PAID: 200,
    });
  });

  it("should read a limit from the environment", () => {
    expect(readUsageLimits({ USAGE_LIMIT_ANONYMOUS: "5" }).ANONYMOUS).toBe(5);
  });

  it("should refuse a limit that is not a positive whole number", () => {
    for (const value of ["0", "-1", "2.5", "tres"]) {
      expect(() => readUsageLimits({ USAGE_LIMIT_REGISTERED: value })).toThrow(
        InvalidUsageLimitsError,
      );
    }
  });
});

describe("Usage day", () => {
  it("should count by the UTC day, whatever the visitor's zone", () => {
    // 23:30 en Caracas es ya el día siguiente en UTC.
    const now = new Date("2026-09-22T03:30:00Z");

    expect(usageDay(now)).toBe("2026-09-22");
  });

  it("should renew at the next UTC midnight", () => {
    expect(nextUsageReset(new Date("2026-09-21T15:00:00Z"))).toEqual(
      new Date("2026-09-22T00:00:00Z"),
    );
    expect(nextUsageReset(new Date("2026-12-31T23:59:59Z"))).toEqual(
      new Date("2027-01-01T00:00:00Z"),
    );
  });

  it("should say how many are left, never fewer than none", () => {
    const now = new Date("2026-09-21T10:00:00Z");

    expect(
      usageStatus("ANONYMOUS", DEFAULT_USAGE_LIMITS, 1, now),
    ).toMatchObject({ limit: 3, used: 1, remaining: 2 });
    expect(
      usageStatus("ANONYMOUS", DEFAULT_USAGE_LIMITS, 7, now).remaining,
    ).toBe(0);
  });
});
