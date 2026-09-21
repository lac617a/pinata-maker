import { describe, expect, it } from "vitest";

import type { UnsavedPosterServices } from "@/application/generate-unsaved-poster";
import { pngHeader } from "@/modules/image-processing/image-header.fixtures";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
} from "@/modules/pdf-generation/print-renderer";
import { InMemoryUsageCounter } from "@/modules/usage/in-memory-usage-counter";
import { DEFAULT_USAGE_LIMITS } from "@/modules/usage/usage";
import { anonymousSubject } from "@/modules/usage/usage-subject";

import {
  handleReadUsage,
  handleUnsavedPoster,
  type UsageRequestContext,
} from "./usage-endpoints";

function context(): UsageRequestContext {
  const services: UnsavedPosterServices = {
    usage: new InMemoryUsageCounter(),
    limits: DEFAULT_USAGE_LIMITS,
    now: () => new Date("2026-09-21T10:00:00Z"),
    renderer: {
      render: async (document, options = {}) => ({
        fileName: options.fileName ?? "x.pdf",
        contentType: PDF_CONTENT_TYPE,
        pageCount: documentPageCount(document),
        bytes: new Uint8Array([37, 80, 68, 70]),
      }),
    },
  };

  return {
    services,
    subject: () =>
      anonymousSubject({
        visitorId: "cookie-1",
        ip: "203.0.113.7",
        day: "2026-09-21",
        secret: "a-test-secret-that-is-long-enough",
      }),
  };
}

function posterForm(options: unknown, fileName = "piñata.png"): Request {
  const form = new FormData();

  form.set(
    "image",
    new File([pngHeader(720, 894)], fileName, { type: "image/png" }),
  );
  form.set("options", JSON.stringify(options));

  return new Request("http://localhost/api/posters", {
    method: "POST",
    body: form,
  });
}

describe("Usage endpoints", () => {
  it("should tell an anonymous visitor how many are left today", async () => {
    const response = await handleReadUsage(context());

    expect(response.status).toBe(200);
    expect((await response.json()).usage).toEqual({
      level: "ANONYMOUS",
      limit: 3,
      used: 0,
      remaining: 3,
      resetsAt: "2026-09-22T00:00:00.000Z",
    });
  });

  it("should hand the PDF back as a download without storing it", async () => {
    const response = await handleUnsavedPoster(
      posterForm({ width: 600 }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(PDF_CONTENT_TYPE);
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="pinata-60cm.pdf"; filename*=UTF-8''pi%C3%B1ata-60cm.pdf`,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-usage-remaining")).toBe("2");
  });

  it("should answer 429 once today's documents are spent", async () => {
    const shared = context();

    for (let i = 0; i < 3; i++) {
      await handleUnsavedPoster(posterForm({ width: 600 }), shared);
    }

    const response = await handleUnsavedPoster(
      posterForm({ width: 600 }),
      shared,
    );

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("USAGE_LIMIT_REACHED");
  });

  it("should refuse a request without options", async () => {
    const form = new FormData();

    form.set(
      "image",
      new File([pngHeader(720, 894)], "a.png", { type: "image/png" }),
    );

    const response = await handleUnsavedPoster(
      new Request("http://localhost/api/posters", {
        method: "POST",
        body: form,
      }),
      context(),
    );

    expect(response.status).toBe(400);
  });

  it("should refuse a crop outside the image", async () => {
    const response = await handleUnsavedPoster(
      posterForm({ width: 600, crop: { x: 0, y: 0, width: 900, height: 894 } }),
      context(),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_IMAGE_CROP");
  });
});
