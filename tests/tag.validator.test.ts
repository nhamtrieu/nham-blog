import assert from "node:assert/strict";
import test from "node:test";

import {
  validateTagCreateInput,
  validateTagReorderInput,
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
      message: "Dữ liệu tag không hợp lệ.",
      fields: {
        name: ["Tên tag là bắt buộc."],
        slug: ["Slug phải chứa chữ hoặc số."],
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
      message: "Cần ít nhất một trường để cập nhật tag.",
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

test("validateTagReorderInput accepts unique uuid list", () => {
  const result = validateTagReorderInput({
    orderedIds: [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.orderedIds.length, 2);
});

test("validateTagReorderInput rejects duplicates", () => {
  const result = validateTagReorderInput({
    orderedIds: [
      "11111111-1111-4111-8111-111111111111",
      "11111111-1111-4111-8111-111111111111",
    ],
  });

  assert.equal(result.success, false);
});
