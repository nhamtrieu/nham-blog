import assert from "node:assert/strict";
import test from "node:test";

import { validateMediaAssetCreateInput } from "@/validators/media.validator";

test("validateMediaAssetCreateInput accepts upload payload and normalizes alt", () => {
  const result = validateMediaAssetCreateInput({
    url: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    publicId: "nham-blog/admin/sample",
    alt: "  Cover image  ",
    width: 1280,
    height: 720,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    url: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    publicId: "nham-blog/admin/sample",
    alt: "Cover image",
    width: 1280,
    height: 720,
  });
});

test("validateMediaAssetCreateInput converts empty alt to null", () => {
  const result = validateMediaAssetCreateInput({
    url: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
    publicId: "nham-blog/admin/sample-2",
    alt: "   ",
    width: 640,
    height: 480,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.alt, null);
});

test("validateMediaAssetCreateInput returns field errors in the standard response shape", () => {
  const result = validateMediaAssetCreateInput({
    url: "not-a-valid-url",
    publicId: "   ",
    width: 0,
    height: -2,
  });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Media asset payload is invalid.",
      fields: {
        url: ["Media URL must be a valid absolute URL."],
        publicId: ["Public ID is required."],
        width: ["Width must be greater than zero."],
        height: ["Height must be greater than zero."],
      },
    },
  });
});
