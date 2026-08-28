import assert from "node:assert/strict";
import test from "node:test";

import { PostStatus } from "@/entities/post.entity";
import {
  toWriterCreateInput,
  toWriterUpdateInput,
} from "@/lib/write/writer-post-payload";
import { validatePostCreateInput, validatePostUpdateInput } from "@/validators/post.validator";

test("toWriterCreateInput always forces DRAFT and clears publishedAt", () => {
  const validated = validatePostCreateInput({
    title: "Writer draft",
    contentMdx: "# Hello",
    status: PostStatus.PUBLISHED,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    tagIds: [],
  });

  assert.equal(validated.success, true);

  if (!validated.success) {
    return;
  }

  const writerInput = toWriterCreateInput(validated.data);

  assert.equal(writerInput.status, PostStatus.DRAFT);
  assert.equal(writerInput.publishedAt, null);
});

test("toWriterUpdateInput strips status and publishedAt", () => {
  const validated = validatePostUpdateInput({
    title: "Updated title",
    status: PostStatus.SCHEDULED,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(validated.success, true);

  if (!validated.success) {
    return;
  }

  const writerInput = toWriterUpdateInput(validated.data);

  assert.equal("status" in writerInput, false);
  assert.equal("publishedAt" in writerInput, false);
  assert.equal(writerInput.title, "Updated title");
});

test("toWriterCreateInput forces DRAFT even when client sends SCHEDULED", () => {
  const validated = validatePostCreateInput({
    title: "Writer schedule attempt",
    contentMdx: "# Hello",
    status: PostStatus.SCHEDULED,
    publishedAt: new Date("2026-12-01T00:00:00.000Z"),
    tagIds: [],
  });

  assert.equal(validated.success, true);

  if (!validated.success) {
    return;
  }

  const writerInput = toWriterCreateInput(validated.data);

  assert.equal(writerInput.status, PostStatus.DRAFT);
  assert.equal(writerInput.publishedAt, null);
});
