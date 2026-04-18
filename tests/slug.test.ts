import assert from "node:assert/strict";
import test from "node:test";

import { createUniqueSlug, slugify } from "@/lib/slug";

test("slugify normalizes Vietnamese accents and punctuation", () => {
  assert.equal(slugify("  Xin chào, thế giới!  "), "xin-chao-the-gioi");
});

test("slugify falls back when the source cannot produce a slug", () => {
  assert.equal(slugify("..."), "untitled");
  assert.equal(slugify("...", "Bai viet moi"), "bai-viet-moi");
});

test("createUniqueSlug keeps the base slug when it is still available", () => {
  assert.equal(createUniqueSlug("Hello World", ["another-post"]), "hello-world");
});

test("createUniqueSlug appends -2 for the first duplicate", () => {
  assert.equal(createUniqueSlug("Hello World", ["hello-world"]), "hello-world-2");
});

test("createUniqueSlug keeps incrementing for repeated duplicates", () => {
  assert.equal(
    createUniqueSlug("Hello World", ["hello-world", "hello-world-2", "hello-world-3"]),
    "hello-world-4"
  );
});

test("createUniqueSlug fills the first available numeric gap", () => {
  assert.equal(
    createUniqueSlug("Hello World", ["hello-world", "hello-world-3"]),
    "hello-world-2"
  );
});

test("createUniqueSlug ignores the current slug during update flows", () => {
  assert.equal(
    createUniqueSlug("Hello World", ["hello-world", "hello-world-2"], {
      currentSlug: "hello-world",
    }),
    "hello-world"
  );
});
