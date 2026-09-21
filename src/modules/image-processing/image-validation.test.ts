import { describe, expect, it } from "vitest";

import {
  ImageFileTooLargeError,
  InvalidImageDimensionsError,
  UnsupportedImageFormatError,
} from "./errors";
import {
  IMAGE_LIMITS,
  imageAspectRatio,
  type ImageMetadata,
  type ImageUpload,
  validateImageMetadata,
  validateImageUpload,
} from "./image-validation";

const upload: ImageUpload = {
  fileName: "pinata.png",
  mimeType: "image/png",
  byteSize: 512 * 1024,
};

const metadata: ImageMetadata = {
  width: 2000,
  height: 2500,
  mimeType: "image/png",
  byteSize: 512 * 1024,
};

describe("Image upload validation", () => {
  it("should accept the formats the product supports", () => {
    expect(validateImageUpload(upload)).toBe("image/png");
    expect(
      validateImageUpload({
        ...upload,
        fileName: "a.jpg",
        mimeType: "image/jpeg",
      }),
    ).toBe("image/jpeg");
    expect(
      validateImageUpload({
        ...upload,
        fileName: "a.webp",
        mimeType: "image/webp",
      }),
    ).toBe("image/webp");
  });

  it("should accept both extensions of a JPEG", () => {
    expect(
      validateImageUpload({
        ...upload,
        fileName: "photo.JPEG",
        mimeType: "image/jpeg",
      }),
    ).toBe("image/jpeg");
  });

  it("should reject a format it cannot read", () => {
    expect(() =>
      validateImageUpload({
        ...upload,
        fileName: "drawing.svg",
        mimeType: "image/svg+xml",
      }),
    ).toThrow(UnsupportedImageFormatError);
  });

  it("should reject a file whose name contradicts its declared type", () => {
    // El nombre lo elige el usuario y el tipo lo declara el cliente: que
    // coincidan es lo mínimo exigible antes de decodificar.
    expect(() =>
      validateImageUpload({ ...upload, fileName: "pinata.exe" }),
    ).toThrow(UnsupportedImageFormatError);
  });

  it("should reject a file heavier than the limit", () => {
    expect(() =>
      validateImageUpload({
        ...upload,
        byteSize: IMAGE_LIMITS.maxFileBytes + 1,
      }),
    ).toThrow(ImageFileTooLargeError);
  });

  it("should reject a file with no readable size", () => {
    expect(() => validateImageUpload({ ...upload, byteSize: 0 })).toThrow(
      ImageFileTooLargeError,
    );
  });
});

describe("Image metadata validation", () => {
  it("should accept an image within the supported range", () => {
    expect(validateImageMetadata(metadata)).toEqual(metadata);
  });

  it("should reject an image too small to give a detailed contour", () => {
    expect(() =>
      validateImageMetadata({ ...metadata, width: IMAGE_LIMITS.minWidth - 1 }),
    ).toThrow(InvalidImageDimensionsError);
  });

  it("should reject an image larger than the system processes", () => {
    expect(() =>
      validateImageMetadata({
        ...metadata,
        height: IMAGE_LIMITS.maxHeight + 1,
      }),
    ).toThrow(InvalidImageDimensionsError);
  });

  it("should reject an image with too many pixels to process", () => {
    expect(() =>
      validateImageMetadata({ ...metadata, width: 8000, height: 8000 }),
    ).toThrow(InvalidImageDimensionsError);
  });

  it("should reject dimensions that are not whole pixel counts", () => {
    expect(() => validateImageMetadata({ ...metadata, width: 1000.5 })).toThrow(
      InvalidImageDimensionsError,
    );
  });

  it("should derive the aspect ratio of the image", () => {
    expect(imageAspectRatio({ ...metadata, width: 2000, height: 1000 })).toBe(
      2,
    );
  });
});
