import { describe, expect, it } from "vitest";

import { UnsupportedImageFormatError } from "@/modules/image-processing/errors";
import {
  jpegHeader,
  pngHeader,
} from "@/modules/image-processing/image-header.fixtures";
import {
  documentPageCount,
  PDF_CONTENT_TYPE,
  type PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import { InvalidPosterSizeError } from "@/modules/posters/errors";
import { UsageLimitReachedError } from "@/modules/usage/errors";
import { InMemoryUsageCounter } from "@/modules/usage/in-memory-usage-counter";
import { DEFAULT_USAGE_LIMITS } from "@/modules/usage/usage";
import { anonymousSubject } from "@/modules/usage/usage-subject";

import {
  generateUnsavedPoster,
  type GenerateUnsavedPosterInput,
  type UnsavedPosterServices,
} from "./generate-unsaved-poster";

function services(): UnsavedPosterServices & { rendered: () => number } {
  let rendered = 0;
  const renderer: PrintRenderer = {
    render: async (document, options = {}) => {
      rendered++;

      return {
        fileName: options.fileName ?? "x.pdf",
        contentType: PDF_CONTENT_TYPE,
        pageCount: documentPageCount(document),
        bytes: new Uint8Array([37, 80, 68, 70]),
      };
    },
  };

  return {
    usage: new InMemoryUsageCounter(),
    limits: DEFAULT_USAGE_LIMITS,
    now: () => new Date("2026-09-21T10:00:00Z"),
    renderer,
    rendered: () => rendered,
  };
}

const subject = anonymousSubject({
  visitorId: "cookie-1",
  ip: "203.0.113.7",
  day: "2026-09-21",
  secret: "a-test-secret-that-is-long-enough",
});

const request: GenerateUnsavedPosterInput = {
  fileName: "spiderman 4.png",
  mimeType: "image/png",
  bytes: pngHeader(720, 894),
  size: { width: 600 },
  subject,
};

describe("Generate unsaved poster", () => {
  it("should hand the PDF back and count it", async () => {
    const context = services();

    const { document, usage } = await generateUnsavedPoster(context, request);

    expect(document.fileName).toBe("spiderman 4-60cm.pdf");
    expect(usage).toMatchObject({ used: 1, remaining: 2 });
  });

  it("should refuse the fourth of the day without generating it", async () => {
    const context = services();

    for (let i = 0; i < 3; i++) {
      await generateUnsavedPoster(context, request);
    }

    await expect(
      generateUnsavedPoster(context, request),
    ).rejects.toBeInstanceOf(UsageLimitReachedError);
    // El cuarto no llega a generarse: el cupo se mira antes de trabajar.
    expect(context.rendered()).toBe(3);
  });

  it("should not count a request with a wrong size", async () => {
    const context = services();

    await expect(
      generateUnsavedPoster(context, { ...request, size: { width: 5000 } }),
    ).rejects.toBeInstanceOf(InvalidPosterSizeError);

    const { usage } = await generateUnsavedPoster(context, request);

    expect(usage.used).toBe(1);
  });

  it("should refuse a file that is not what it says", async () => {
    await expect(
      generateUnsavedPoster(services(), {
        ...request,
        bytes: jpegHeader(720, 894),
      }),
    ).rejects.toBeInstanceOf(UnsupportedImageFormatError);
  });

  it("should keep a safe title from any file name", async () => {
    const { document } = await generateUnsavedPoster(services(), {
      ...request,
      fileName: '../../"piñata"<script>.png',
    });

    expect(document.fileName).toBe("piñata script-60cm.pdf");
  });
});
