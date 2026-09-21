import { UnsupportedImageFormatError } from "@/modules/image-processing/errors";
import {
  orientedSize,
  readImageHeader,
} from "@/modules/image-processing/image-header";
import {
  canSendAsIs,
  type EncodeAttempt,
  encodeAttempts,
  preparedFileName,
  UPLOAD_PREPARATION,
} from "@/modules/image-processing/upload-preparation";
import { formatBytes } from "@/presentation/client/format";

/** What was chosen and what will be sent. */
export type PreparedImage = {
  readonly file: File;
  /** False when the original goes as it is. */
  readonly shrunk: boolean;
  readonly original: {
    readonly byteSize: number;
    readonly width: number;
    readonly height: number;
  };
  readonly sent: {
    readonly byteSize: number;
    readonly width: number;
    readonly height: number;
  };
};

/** A failure the person can act on; the message is for them. */
export class ImagePreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePreparationError";
  }
}

/**
 * Makes sure an image fits in a request before it leaves the browser.
 *
 * Light, reasonably sized images go untouched: same bytes, same quality, and
 * the server straightens camera photos itself (docs/pdf.md §97). Anything
 * heavier is redrawn at the size it actually needs and re-encoded until it
 * fits (docs/image-processing.md §111). Redrawing also applies the camera
 * rotation, so what is sent is already upright.
 */
export async function prepareImageForUpload(
  file: File,
): Promise<PreparedImage> {
  if (file.size > UPLOAD_PREPARATION.maxInputBytes) {
    throw new ImagePreparationError(
      `La imagen pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(UPLOAD_PREPARATION.maxInputBytes)}.`,
    );
  }

  const header = await readHeader(file);
  const upright = orientedSize(header);
  const original = { byteSize: file.size, ...upright };

  if (canSendAsIs(original)) {
    return { file, shrunk: false, original, sent: original };
  }

  // `createImageBitmap` applies the EXIF orientation by default: the bitmap
  // is already upright, and so is everything drawn from it.
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImagePreparationError(
      "No pudimos abrir la imagen. Prueba con otro archivo PNG, JPEG o WEBP.",
    );
  });

  try {
    for (const { format, ...attempt } of formatAttempts(
      header.format,
      encodeAttempts(bitmap),
    )) {
      const blob = await encode(bitmap, attempt, format);

      if (blob.size <= UPLOAD_PREPARATION.budgetBytes) {
        return {
          file: new File([blob], preparedFileName(file.name, format), {
            type: format,
            lastModified: file.lastModified,
          }),
          shrunk: true,
          original,
          sent: {
            byteSize: blob.size,
            width: attempt.width,
            height: attempt.height,
          },
        };
      }
    }
  } finally {
    bitmap.close();
  }

  throw new ImagePreparationError(
    "No pudimos reducir la imagen lo suficiente para enviarla. Prueba recortándola antes o con otra imagen.",
  );
}

/**
 * The header is near the start of the file. Reading the first bytes is
 * enough, and a 30 MB photo is not loaded twice.
 */
async function readHeader(file: File) {
  const head = new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer());

  try {
    return readImageHeader(head);
  } catch (error) {
    throw new ImagePreparationError(
      error instanceof UnsupportedImageFormatError
        ? "Usa una imagen PNG, JPEG o WEBP."
        : "No pudimos leer la imagen. Prueba con otro archivo.",
    );
  }
}

/**
 * Which format each attempt is encoded in.
 *
 * A JPEG stays JPEG. A PNG or WEBP is first tried as PNG at the largest
 * size: lossless, the best for line drawings, which is what most piñata
 * images are. If that does not fit, the rest go as JPEG on white. A cut-out
 * photo with a transparent background compresses badly as PNG, and on paper
 * transparency is the white of the sheet anyway: the PDF draws it that way
 * (docs/pdf.md §98). Nothing visible is lost.
 */
function formatAttempts(
  source: string,
  attempts: EncodeAttempt[],
): (EncodeAttempt & { format: "image/jpeg" | "image/png" })[] {
  const jpeg = attempts.map((a) => ({ ...a, format: "image/jpeg" as const }));

  return source === "image/jpeg"
    ? jpeg
    : [{ ...attempts[0], format: "image/png" as const }, ...jpeg];
}

async function encode(
  bitmap: ImageBitmap,
  size: { width: number; height: number; quality: number },
  format: "image/jpeg" | "image/png",
): Promise<Blob> {
  const target = canvas(size.width, size.height);
  const context = target.getContext("2d");

  if (!context) {
    throw new ImagePreparationError("Tu navegador no pudo preparar la imagen.");
  }

  if (format === "image/jpeg") {
    // JPEG has no transparency: without a background it would turn black.
    // White is what the paper shows where the image is transparent.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, size.width, size.height);

  return new Promise((resolve, reject) =>
    target.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new ImagePreparationError(
                "Tu navegador no pudo preparar la imagen.",
              ),
            ),
      format,
      size.quality,
    ),
  );
}

function canvas(width: number, height: number): HTMLCanvasElement {
  const element = document.createElement("canvas");

  element.width = width;
  element.height = height;

  return element;
}
