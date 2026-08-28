import assert from "node:assert/strict";
import test from "node:test";

import { PostStatus } from "@/entities/post.entity";
import {
  validatePostCreateInput,
  validatePostUpdateInput,
} from "@/validators/post.validator";

const FIRST_TAG_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_TAG_ID = "22222222-2222-4222-8222-222222222222";

test("validatePostCreateInput normalizes optional values and defaults status", () => {
  const result = validatePostCreateInput({
    title: "  Xin chao Next.js  ",
    slug: "Xin Chao Next.js",
    excerpt: "  Tom tat ngan  ",
    contentMdx: "# Hello world",
    coverImageUrl: "",
    seoTitle: "  SEO title  ",
    seoDescription: "  SEO description  ",
    tagIds: [FIRST_TAG_ID, SECOND_TAG_ID],
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    title: "Xin chao Next.js",
    slug: "xin-chao-next-js",
    excerpt: "Tom tat ngan",
    contentMdx: "# Hello world",
    coverImageUrl: null,
    status: PostStatus.DRAFT,
    seoTitle: "SEO title",
    seoDescription: "SEO description",
    tagIds: [FIRST_TAG_ID, SECOND_TAG_ID],
    sendNewsletter: true,
  });
});

test("validatePostCreateInput returns field errors in the standard response shape", () => {
  const result = validatePostCreateInput({
    title: "",
    slug: "...",
    excerpt: "x".repeat(501),
    contentMdx: "   ",
    coverImageUrl: "not-a-url",
    seoTitle: "y".repeat(256),
    seoDescription: "z".repeat(321),
    tagIds: [FIRST_TAG_ID, FIRST_TAG_ID],
  });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Post payload is invalid.",
      fields: {
        title: ["Title is required."],
        slug: ["Slug must contain letters or numbers."],
        excerpt: ["Excerpt must be at most 500 characters."],
        contentMdx: ["Content is required."],
        coverImageUrl: ["Cover image URL must be a valid absolute URL."],
        seoTitle: ["SEO title must be at most 255 characters."],
        seoDescription: ["SEO description must be at most 320 characters."],
        tagIds: ["Tag IDs must be unique."],
      },
    },
  });
});

test("validatePostCreateInput rejects publishedAt when the post remains a draft", () => {
  const result = validatePostCreateInput({
    title: "Draft post",
    contentMdx: "# Draft",
    status: PostStatus.DRAFT,
    publishedAt: "2026-04-17T10:00:00.000Z",
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.deepEqual(result.error.fields, {
    publishedAt: ["Draft posts cannot define a published date."],
  });
});

test("validatePostCreateInput requires publishedAt for scheduled posts", () => {
  const result = validatePostCreateInput({
    title: "Scheduled post",
    contentMdx: "# Later",
    status: PostStatus.SCHEDULED,
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.deepEqual(result.error.fields, {
    publishedAt: ["Scheduled posts require a publish date."],
  });
});

test("validatePostCreateInput accepts scheduled posts with a publish date", () => {
  const result = validatePostCreateInput({
    title: "Scheduled post",
    contentMdx: "# Later",
    status: PostStatus.SCHEDULED,
    publishedAt: "2026-12-01T10:00:00.000Z",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.equal(result.data.status, PostStatus.SCHEDULED);
  assert.equal(result.data.publishedAt?.toISOString(), "2026-12-01T10:00:00.000Z");
});

test("validatePostUpdateInput requires at least one field", () => {
  const result = validatePostUpdateInput({});

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Provide at least one field to update the post.",
    },
  });
});

test("validatePostUpdateInput accepts partial payloads and normalizes provided fields", () => {
  const result = validatePostUpdateInput({
    slug: " Updated Slug ",
    excerpt: "",
    publishedAt: null,
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    slug: "updated-slug",
    excerpt: null,
    publishedAt: null,
  });
});
