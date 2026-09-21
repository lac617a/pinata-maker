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

/**
 * El nombre del archivo sin extensión, como título del documento.
 *
 * Solo letras, números, espacios y guiones: acaba en el nombre del PDF y
 * en la cabecera de la descarga.
 */
function titleFrom(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} _-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  return base.length > 0 ? base : "poster";
}
