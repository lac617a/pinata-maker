import { describe, expect, it } from "vitest";

import { UsageLimitReachedError } from "@/modules/usage/errors";
import { InMemoryUsageCounter } from "@/modules/usage/in-memory-usage-counter";
import { DEFAULT_USAGE_LIMITS } from "@/modules/usage/usage";
import {
  anonymousSubject,
  registeredSubject,
} from "@/modules/usage/usage-subject";

import {
  assertUsageLeft,
  consumeUsage,
  readUsage,
  type UsageServices,
} from "./daily-usage";

function services(at = "2026-09-21T10:00:00Z"): UsageServices & {
  clock: { now: Date };
} {
  const clock = { now: new Date(at) };

  return {
    usage: new InMemoryUsageCounter(),
    limits: DEFAULT_USAGE_LIMITS,
    now: () => clock.now,
    clock,
  };
}

const visitor = anonymousSubject({
  visitorId: "cookie-1",
  ip: "203.0.113.7",
  day: "2026-09-21",
  secret: "a-test-secret-that-is-long-enough",
});

describe("Daily usage", () => {
  it("should give an anonymous visitor three documents a day", async () => {
    const context = services();

    expect(await readUsage(context, visitor)).toMatchObject({
      level: "ANONYMOUS",
      limit: 3,
      remaining: 3,
      resetsAt: new Date("2026-09-22T00:00:00Z"),
    });
  });

  it("should give an account more than an anonymous visitor", async () => {
    const status = await readUsage(services(), registeredSubject("u-1"));

    expect(status.limit).toBe(20);
  });

  it("should take one per document and refuse the fourth", async () => {
    const context = services();

    await consumeUsage(context, visitor);
    await consumeUsage(context, visitor);
    const third = await consumeUsage(context, visitor);

    expect(third.remaining).toBe(0);
    await expect(consumeUsage(context, visitor)).rejects.toBeInstanceOf(
      UsageLimitReachedError,
    );
  });

  it("should refuse before working when nothing is left", async () => {
    const context = services();

    for (let i = 0; i < 3; i++) {
      await consumeUsage(context, visitor);
    }

    await expect(assertUsageLeft(context, visitor)).rejects.toBeInstanceOf(
      UsageLimitReachedError,
    );
  });

  it("should start again the next day", async () => {
    const context = services();

    for (let i = 0; i < 3; i++) {
      await consumeUsage(context, visitor);
    }

    context.clock.now = new Date("2026-09-22T00:00:01Z");

    expect((await readUsage(context, visitor)).remaining).toBe(3);
  });

  it("should not share the count between two accounts", async () => {
    const context = services();

    await consumeUsage(context, registeredSubject("u-1"));

    expect((await readUsage(context, registeredSubject("u-2"))).remaining).toBe(
      20,
    );
  });
});
