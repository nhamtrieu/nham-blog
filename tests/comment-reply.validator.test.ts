import assert from "node:assert/strict";
import test from "node:test";

import { validateCommentCreateInput } from "@/validators/comment.validator";

test("validateCommentCreateInput accepts optional parentId", () => {
  const result = validateCommentCreateInput({
    content: "Tra loi",
    parentId: "11111111-1111-4111-8111-111111111111",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.content, "Tra loi");
  assert.equal(result.data.parentId, "11111111-1111-4111-8111-111111111111");
});

test("validateCommentCreateInput rejects invalid parentId", () => {
  const result = validateCommentCreateInput({
    content: "Tra loi",
    parentId: "not-a-uuid",
  });

  assert.equal(result.success, false);
});
