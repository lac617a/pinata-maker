import type { Pixels } from "./pixel-contour";

/**
 * What the browser sends, so that a request always fits.
 *
 * On Vercel a function accepts and returns at most 4.5 MB, and a phone photo
 * often weighs more (docs/deploy.md §4). The browser shrinks the image before
 * sending it, only as much as needed. See docs/image-processing.md §111.
 */
export const UPLOAD_PREPARATION = {
  /**
   * Target size of what is sent. Below 4.5 MB with room to spare: the
   * multipart body adds a little, and without an account the PDF comes back
   * in the response, about as heavy as the image it embeds.
   */
  budgetBytes: 3.5 * 1024 * 1024,
  /**
   * Longest side that is ever sent. At 150 pixels per inch it covers 69 cm,
   * and a 1 m piñata still gets over 100: sharp even up close
   * (docs/pdf.md §96).
   */
  maxSide: 4096,
  /** Never shrink below this: detail stops being worth the weight. */
  minSide: 1200,
  /** What the browser accepts to start with, before shrinking. */
  maxInputBytes: 30 * 1024 * 1024,
} as const;

type ImageFacts = {
  readonly byteSize: number;
  readonly width: Pixels;
  readonly height: Pixels;
};

/** Sent untouched: already light and small enough. */
export function canSendAsIs(image: ImageFacts): boolean {
  return (
    image.byteSize <= UPLOAD_PREPARATION.budgetBytes &&
    Math.max(image.width, image.height) <= UPLOAD_PREPARATION.maxSide
  );
}

/** One try at re-encoding: size and, for JPEG, quality. */
export type EncodeAttempt = {
  readonly width: Pixels;
  readonly height: Pixels;
  /** 0 to 1. Ignored for PNG, which is lossless. */
  readonly quality: number;
};

/**
 * The tries, from best to lightest, until one fits the budget.
 *
 * First down to `maxSide` at high quality; then a bit less quality; then
 * smaller, step by step, never under `minSide` on the longest side. The last
 * one is the lightest the app will send. Proportion is always kept.
 */
export function encodeAttempts(image: {
  readonly width: Pixels;
  readonly height: Pixels;
}): EncodeAttempt[] {
  const longest = Math.max(image.width, image.height);
  const start = Math.min(1, UPLOAD_PREPARATION.maxSide / longest);
  const floor = Math.min(start, UPLOAD_PREPARATION.minSide / longest);

  const at = (scale: number, quality: number): EncodeAttempt => ({
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
    quality,
  });

  const attempts = [at(start, 0.9), at(start, 0.8)];

  for (let scale = start * 0.8; scale > floor; scale *= 0.8) {
    attempts.push(at(scale, 0.8));
  }

  if (floor < start) {
    attempts.push(at(floor, 0.75));
  }

  return attempts;
}

/**
 * The name of the file that is sent: same base, the extension of what it
 * became. The title of the PDF comes from it.
 */
export function preparedFileName(
  original: string,
  format: "image/jpeg" | "image/png",
): string {
  const base = original.replace(/\.[^.]*$/, "") || "imagen";

  return `${base}.${format === "image/png" ? "png" : "jpg"}`;
}
