import { TermsAcceptanceRequiredError } from "@/modules/accounts/errors";
import { validateImageUpload } from "@/modules/image-processing/image-validation";
import type {
  PrintableDocument,
  PrintRenderer,
} from "@/modules/pdf-generation/print-renderer";
import type { UsageStatus } from "@/modules/usage/usage";
import type { UsageSubject } from "@/modules/usage/usage-subject";

import {
  assertUsageLeft,
  consumeUsage,
  type UsageServices,
} from "./daily-usage";
import { makePosterDocument, type PosterRequest } from "./make-poster-document";
import { assertImageContent } from "./upload-project-image";

export type UnsavedPosterServices = UsageServices & {
  readonly renderer: PrintRenderer;
};

export type GenerateUnsavedPosterInput = PosterRequest & {
  readonly fileName: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
  readonly subject: UsageSubject;
  /**
   * The explicit acceptance of the terms and the data policy. Required
   * without an account; an account accepted them when it was created.
   */
  readonly acceptedTerms?: unknown;
};

/**
 * El póster sin cuenta: la imagen entra, el PDF sale y nada se guarda.
 *
 * Es el uso anónimo del PRD §38: el visitante no conserva proyectos, así que
 * ni la imagen ni el documento pasan por el object storage. Lo único que
 * queda es la cuenta del día (docs/usage.md §2).
 *
 * El archivo se valida igual que en una subida: lo que declara el navegador
 * tiene que coincidir con lo que hay dentro.
 */
export async function generateUnsavedPoster(
  services: UnsavedPosterServices,
  input: GenerateUnsavedPosterInput,
): Promise<{
  readonly document: PrintableDocument;
  readonly usage: UsageStatus;
}> {
  const mimeType = validateImageUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
  });

  assertImageContent(mimeType, input.bytes);

  // Without an account, nothing is processed until the person accepted,
  // with a tick of their own: like signing up, only an explicit yes counts
  // (docs/legal.md §8).
  if (input.subject.level === "ANONYMOUS" && input.acceptedTerms !== true) {
    throw new TermsAcceptanceRequiredError(
      "A download without an account needs the terms accepted.",
    );
  }

  // Sin cupo no se trabaja: generar para negar después no tiene sentido.
  await assertUsageLeft(services, input.subject);

  const { document } = await makePosterDocument({
    bytes: input.bytes,
    request: input,
    title: titleFrom(input.fileName),
    renderer: services.renderer,
    now: services.now(),
  });

  // Con el documento hecho, y antes de entregarlo: si dos peticiones se
  // cruzan con el último del día, solo una se lo lleva.
  const usage = await consumeUsage(services, input.subject);

  return { document, usage };
}

/** The title when the file name says nothing about the image. */
export const FALLBACK_POSTER_TITLE = "Mi póster";

/**
 * Words cameras and apps put in file names. They say how the picture was
 * taken, not what it shows.
 */
const CAMERA_WORDS = new Set([
  "img",
  "dsc",
  "dscn",
  "dcim",
  "pxl",
  "mvimg",
  "whatsapp",
  "image",
  "photo",
  "screenshot",
  "captura",
  "pantalla",
]);

/**
 * The file name without extension, as the document title — when it means
 * something.
 *
 * Facebook, WhatsApp and phone cameras name files with numbers
 * (`486610417_122147236376460730_…_n.jpg`, `IMG_20240912_153011.jpg`).
 * As a title that is noise on the summary sheet and in the PDF name, so
 * without a single real word it becomes "Mi póster".
 *
 * Only letters, digits, spaces and hyphens survive: the title ends up in the
 * PDF name and in the download header.
 */
export function titleFrom(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} _-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  const meaningful = base
    .split(/[\s_-]+/)
    .some(
      (word) =>
        /^\p{L}{3,}$/u.test(word) && !CAMERA_WORDS.has(word.toLowerCase()),
    );

  return meaningful ? base : FALLBACK_POSTER_TITLE;
}
