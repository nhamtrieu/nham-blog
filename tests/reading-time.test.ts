import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateReadingTimeFromMdx,
  countWordsInMdx,
  extractReadableTextFromMdx,
} from "@/lib/reading-time";

test("extractReadableTextFromMdx keeps visible markdown text and removes syntax", () => {
  const content = `
# Hello world

Xin chao **ban**.

- Mot [duong dan](https://example.com)
- ![Anh bia](https://example.com/cover.png)
`;

  assert.equal(
    extractReadableTextFromMdx(content),
    "Hello world Xin chao ban. Mot duong dan Anh bia"
  );
});

test("countWordsInMdx ignores frontmatter, imports, exports, code fences, and expressions", () => {
  const content = `---
title: Demo
---
import Demo from "./demo"
export const title = "Ignored"

# Bai viet moi

<Callout>Day la ghi chu</Callout>

\`lenh nhanh\`

{1 + 2}

\`\`\`ts
const hidden = "code block"
\`\`\`
`;

  assert.equal(countWordsInMdx(content), 9);
});

test("calculateReadingTimeFromMdx returns zero for empty content", () => {
  assert.equal(calculateReadingTimeFromMdx(""), 0);
  assert.equal(calculateReadingTimeFromMdx("```ts\nconst x = 1\n```"), 0);
});

test("calculateReadingTimeFromMdx rounds up to the next minute", () => {
  const content = `${"word ".repeat(201)}`;

  assert.equal(countWordsInMdx(content), 201);
  assert.equal(calculateReadingTimeFromMdx(content), 2);
});

test("calculateReadingTimeFromMdx supports a custom words-per-minute rate", () => {
  const content = `${"doc ".repeat(450)}`;

  assert.equal(calculateReadingTimeFromMdx(content, 225), 2);
});
