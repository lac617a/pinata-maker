import { describe, expect, it } from "vitest";

import {
  createImageCrop,
  CROP_MIN_SIDE,
  fullImageCrop,
  posterImagePlacement,
} from "./crop";
import { InvalidImageCropError } from "./errors";
import { createPoster } from "./poster";

const image = { width: 720, height: 894 };

describe("Image crop", () => {
  it("should cover the whole image when nothing is cropped", () => {
    expect(fullImageCrop(image)).toEqual({
      x: 0,
      y: 0,
      width: 720,
      height: 894,
    });
  });

  it("should accept a crop inside the image", () => {
    const crop = { x: 100, y: 50, width: 400, height: 500 };

    expect(createImageCrop(image, crop)).toEqual(crop);
  });

  it("should refuse a crop that falls outside the image", () => {
    expect(() =>
      createImageCrop(image, { x: 400, y: 0, width: 400, height: 400 }),
    ).toThrow(InvalidImageCropError);
    expect(() =>
      createImageCrop(image, { x: -1, y: 0, width: 400, height: 400 }),
    ).toThrow(InvalidImageCropError);
  });

  it("should refuse a crop too small to enlarge", () => {
    expect(() =>
      createImageCrop(image, {
        x: 0,
        y: 0,
        width: CROP_MIN_SIDE - 1,
        height: 400,
      }),
    ).toThrow(InvalidImageCropError);
  });

  it("should refuse a crop that is not made of numbers", () => {
    expect(() =>
      createImageCrop(image, { x: Number.NaN, y: 0, width: 400, height: 400 }),
    ).toThrow(InvalidImageCropError);
  });
});

describe("Image placement in a cropped poster", () => {
  it("should place the image so the crop fills the poster exactly", () => {
    const crop = { x: 100, y: 200, width: 400, height: 300 };
    const poster = createPoster(crop, { width: 800 });
    const placement = posterImagePlacement(poster, image, crop);

    // 2 mm por pixel: el recorte empieza en (0,0) y acaba en el borde.
    expect(poster.height).toBeCloseTo(600, 6);
    expect(placement.x).toBeCloseTo(-200, 6);
    expect(placement.y).toBeCloseTo(-400, 6);
    expect(placement.x + (crop.x + crop.width) * 2).toBeCloseTo(
      poster.width,
      6,
    );
    expect(placement.width).toBeCloseTo(1440, 6);
    expect(placement.height).toBeCloseTo(1788, 6);
  });

  it("should place the whole image at the origin without a crop", () => {
    const poster = createPoster(image, { width: 600 });

    const placement = posterImagePlacement(poster, image, fullImageCrop(image));

    expect(placement.x).toBeCloseTo(0, 6);
    expect(placement.y).toBeCloseTo(0, 6);
    expect(placement.width).toBeCloseTo(600, 6);
    expect(placement.height).toBeCloseTo(poster.height, 6);
  });
});
