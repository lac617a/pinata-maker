import { describe, expect, it } from "vitest";

import { InvalidSiteUrlError, readSiteUrl } from "./site-url";

describe("Site URL", () => {
  it("should keep only the origin, without a trailing slash", () => {
    expect(
      readSiteUrl({ NEXT_PUBLIC_SITE_URL: " https://pinatamaker.com/ " }),
    ).toBe("https://pinatamaker.com");
  });

  it("should fall back to localhost while developing", () => {
    expect(readSiteUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000",
    );
  });

  it("should refuse to run in production without it", () => {
    // Un sitemap con enlaces a localhost es peor que un error al arrancar.
    expect(() => readSiteUrl({ NODE_ENV: "production" })).toThrow(
      InvalidSiteUrlError,
    );
  });

  it("should refuse something that is not a web address", () => {
    for (const value of ["pinatamaker", "ftp://pinatamaker.com"]) {
      expect(() => readSiteUrl({ NEXT_PUBLIC_SITE_URL: value })).toThrow(
        InvalidSiteUrlError,
      );
    }
  });
});
