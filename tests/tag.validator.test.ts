import assert from "node:assert/strict";
import test from "node:test";

import {
  validateTagCreateInput,
  validateTagUpdateInput,
} from "@/validators/tag.validator";

test("validateTagCreateInput normalizes name and slug", () => {
  const result = validateTagCreateInput({
    name: "  JavaScript  ",
    slug: "  JavaScript Basics  ",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    name: "JavaScript",
    slug: "javascript-basics",
  });
});

test("validateTagCreateInput allows omitting slug so service can derive it", () => {
  const result = validateTagCreateInput({
    name: "React",
    slug: "   ",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    name: "React",
    slug: undefined,
  });
});

test("validateTagCreateInput returns field errors in the standard response shape", () => {
  const result = validateTagCreateInput({
    name: "",
    slug: "...",
  });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Tag payload is invalid.",
      fields: {
        name: ["Name is required."],
        slug: ["Slug must contain letters or numbers."],
      },
    },
  });
});

test("validateTagUpdateInput requires at least one field", () => {
  const result = validateTagUpdateInput({});

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Provide at least one field to update the tag.",
    },
  });
});

test("validateTagUpdateInput accepts partial payloads and normalizes provided fields", () => {
  const result = validateTagUpdateInput({
    name: "  TypeScript  ",
    slug: "  TS Deep Dive  ",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    name: "TypeScript",
    slug: "ts-deep-dive",
  });
});
