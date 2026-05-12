import assert from "node:assert/strict";
import test from "node:test";

import { CommentStatus } from "@/entities/comment.entity";
import {
  validateCommentAdminListQuery,
  validateCommentCreateInput,
  validateCommentModerationInput,
} from "@/validators/comment.validator";

test("validateCommentCreateInput trims content", () => {
  const result = validateCommentCreateInput({
    content: "  Noi dung binh luan  ",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    content: "Noi dung binh luan",
  });
});

test("validateCommentCreateInput rejects empty content", () => {
  const result = validateCommentCreateInput({
    content: "   ",
  });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Comment payload is invalid.",
      fields: {
        content: ["Comment content is required."],
      },
    },
  });
});

test("validateCommentModerationInput allows final moderation statuses", () => {
  for (const status of [CommentStatus.APPROVED, CommentStatus.REJECTED, CommentStatus.SPAM]) {
    const result = validateCommentModerationInput({ status });

    assert.equal(result.success, true);

    if (!result.success) {
      continue;
    }

    assert.deepEqual(result.data, { status });
  }
});

test("validateCommentModerationInput rejects pending status", () => {
  const result = validateCommentModerationInput({
    status: CommentStatus.PENDING,
  });

  assert.equal(result.success, false);
});

test("validateCommentAdminListQuery accepts status and trims search", () => {
  const result = validateCommentAdminListQuery({
    status: CommentStatus.PENDING,
    search: "  user@example.com  ",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    status: CommentStatus.PENDING,
    search: "user@example.com",
  });
});
