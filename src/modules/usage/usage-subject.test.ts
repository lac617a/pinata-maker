import { describe, expect, it } from "vitest";

import { anonymousSubject, registeredSubject } from "./usage-subject";

const base = {
  visitorId: "2f0c9b8e-0000-4000-8000-000000000001",
  ip: "203.0.113.7",
  day: "2026-09-21",
  secret: "a-test-secret-that-is-long-enough",
};

describe("Usage subject", () => {
  it("should count a registered user by their account", () => {
    expect(registeredSubject("u-1")).toEqual({
      level: "REGISTERED",
      keys: ["user:u-1"],
    });
  });

  it("should count an anonymous visitor by cookie and by IP", () => {
    const subject = anonymousSubject(base);

    expect(subject.level).toBe("ANONYMOUS");
    expect(subject.keys).toHaveLength(2);
    expect(subject.keys[0]).toMatch(/^visitor:[0-9a-f]{32}$/);
    expect(subject.keys[1]).toMatch(/^ip:[0-9a-f]{32}$/);
  });

  it("should never keep the cookie or the IP in clear", () => {
    const keys = anonymousSubject(base).keys.join(" ");

    expect(keys).not.toContain(base.visitorId);
    expect(keys).not.toContain(base.ip);
  });

  it("should give the same IP the same key on the same day", () => {
    const one = anonymousSubject(base);
    const other = anonymousSubject({ ...base, visitorId: "another-cookie" });

    // Otra cookie, misma IP: comparten la clave de IP, y con ella el cupo.
    expect(other.keys[1]).toBe(one.keys[1]);
    expect(other.keys[0]).not.toBe(one.keys[0]);
  });

  it("should not link the IP of one day to the next", () => {
    const today = anonymousSubject(base);
    const tomorrow = anonymousSubject({ ...base, day: "2026-09-22" });

    expect(tomorrow.keys[1]).not.toBe(today.keys[1]);
  });

  it("should depend on the server secret", () => {
    const other = anonymousSubject({ ...base, secret: "another-secret-value" });

    expect(other.keys[0]).not.toBe(anonymousSubject(base).keys[0]);
  });

  it("should count by the cookie alone when the IP is unknown", () => {
    expect(anonymousSubject({ ...base, ip: null }).keys).toHaveLength(1);
  });
});
