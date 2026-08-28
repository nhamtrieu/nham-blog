import assert from "node:assert/strict";
import test from "node:test";

import { PostStatus } from "@/entities/post.entity";
import { cosineSimilarity } from "@/lib/embedding";
import {
  isPostPubliclyVisible,
  pickRelatedPostIds,
  resolveCreatePublicationState,
  resolveUpdatePublicationState,
} from "@/lib/post-publication";

const NOW = new Date("2026-08-24T10:00:00.000Z");
const PAST = new Date("2026-08-24T09:00:00.000Z");
const FUTURE = new Date("2026-08-24T12:00:00.000Z");

test("isPostPubliclyVisible requires live status and publishedAt <= now", () => {
  assert.equal(
    isPostPubliclyVisible({ status: PostStatus.PUBLISHED, publishedAt: PAST }, NOW),
    true
  );
  assert.equal(
    isPostPubliclyVisible({ status: PostStatus.SCHEDULED, publishedAt: PAST }, NOW),
    true
  );
  assert.equal(
    isPostPubliclyVisible({ status: PostStatus.SCHEDULED, publishedAt: FUTURE }, NOW),
    false
  );
  assert.equal(
    isPostPubliclyVisible({ status: PostStatus.DRAFT, publishedAt: PAST }, NOW),
    false
  );
  assert.equal(
    isPostPubliclyVisible({ status: PostStatus.PUBLISHED, publishedAt: null }, NOW),
    false
  );
});

test("resolveCreatePublicationState schedules future dates and coerces past schedules", () => {
  assert.deepEqual(resolveCreatePublicationState(PostStatus.DRAFT, FUTURE, NOW), {
    status: PostStatus.DRAFT,
    publishedAt: null,
  });

  assert.deepEqual(resolveCreatePublicationState(PostStatus.PUBLISHED, undefined, NOW), {
    status: PostStatus.PUBLISHED,
    publishedAt: NOW,
  });

  assert.deepEqual(resolveCreatePublicationState(PostStatus.PUBLISHED, FUTURE, NOW), {
    status: PostStatus.SCHEDULED,
    publishedAt: FUTURE,
  });

  assert.deepEqual(resolveCreatePublicationState(PostStatus.SCHEDULED, FUTURE, NOW), {
    status: PostStatus.SCHEDULED,
    publishedAt: FUTURE,
  });

  assert.deepEqual(resolveCreatePublicationState(PostStatus.SCHEDULED, PAST, NOW), {
    status: PostStatus.PUBLISHED,
    publishedAt: PAST,
  });

  assert.deepEqual(resolveCreatePublicationState(PostStatus.SCHEDULED, null, NOW), {
    status: PostStatus.PUBLISHED,
    publishedAt: NOW,
  });
});

test("resolveUpdatePublicationState clears draft and coerces schedule edges", () => {
  assert.deepEqual(
    resolveUpdatePublicationState(
      { status: PostStatus.PUBLISHED, publishedAt: PAST },
      { status: PostStatus.DRAFT },
      NOW
    ),
    { status: PostStatus.DRAFT, publishedAt: null }
  );

  assert.deepEqual(
    resolveUpdatePublicationState(
      { status: PostStatus.DRAFT, publishedAt: null },
      { status: PostStatus.SCHEDULED, publishedAt: FUTURE },
      NOW
    ),
    { status: PostStatus.SCHEDULED, publishedAt: FUTURE }
  );

  assert.deepEqual(
    resolveUpdatePublicationState(
      { status: PostStatus.SCHEDULED, publishedAt: FUTURE },
      { status: PostStatus.PUBLISHED, publishedAt: null },
      NOW
    ),
    { status: PostStatus.PUBLISHED, publishedAt: NOW }
  );

  assert.deepEqual(
    resolveUpdatePublicationState(
      { status: PostStatus.DRAFT, publishedAt: null },
      { status: PostStatus.PUBLISHED },
      NOW
    ),
    { status: PostStatus.PUBLISHED, publishedAt: NOW }
  );
});

test("pickRelatedPostIds ranks by tag overlap then recency and fills fallback", () => {
  const ids = pickRelatedPostIds({
    excludeId: "source",
    sourceTagIds: ["a", "b"],
    limit: 3,
    candidates: [
      { id: "one-tag", tagIds: ["a"], publishedAt: PAST },
      { id: "two-tags", tagIds: ["a", "b"], publishedAt: PAST },
      { id: "no-tags", tagIds: [], publishedAt: FUTURE },
      { id: "newer-one-tag", tagIds: ["b"], publishedAt: FUTURE },
      { id: "source", tagIds: ["a", "b"], publishedAt: NOW },
    ],
  });

  assert.deepEqual(ids, ["two-tags", "newer-one-tag", "one-tag"]);
});

test("pickRelatedPostIds ranks by cosine when embeddings exist", () => {
  const source = [1, 0];
  const ids = pickRelatedPostIds({
    excludeId: "source",
    sourceTagIds: ["unrelated"],
    sourceEmbedding: source,
    limit: 2,
    candidates: [
      { id: "same-topic", tagIds: [], publishedAt: PAST, embedding: [0.9, 0.1] },
      { id: "other-topic", tagIds: ["unrelated"], publishedAt: FUTURE, embedding: [0, 1] },
      { id: "also-close", tagIds: [], publishedAt: FUTURE, embedding: [0.8, 0.2] },
      { id: "source", tagIds: [], publishedAt: NOW, embedding: source },
    ],
  });

  assert.deepEqual(ids, ["same-topic", "also-close"]);
});

test("pickRelatedPostIds fills with tags when too few embeddings exist", () => {
  const ids = pickRelatedPostIds({
    excludeId: "source",
    sourceTagIds: ["a"],
    sourceEmbedding: [1, 0],
    limit: 2,
    candidates: [
      { id: "embedded", tagIds: [], publishedAt: PAST, embedding: [1, 0] },
      { id: "tagged", tagIds: ["a"], publishedAt: FUTURE },
    ],
  });

  assert.deepEqual(ids, ["embedded", "tagged"]);
});

test("cosineSimilarity is 1 for identical vectors and 0 for orthogonal", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});
