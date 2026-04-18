import assert from "node:assert/strict";
import test from "node:test";

import { extractMdxHeadings, SANITIZED_HEADING_ID_PREFIX } from "@/lib/mdx-headings";

test("extractMdxHeadings skips h1 and uses sanitize id prefix on hrefs", () => {
  const source = `# Title\n\n## Intro\n\n### Detail\n\n## Outro\n`;
  const items = extractMdxHeadings(source);

  assert.deepEqual(
    items.map((item) => ({ depth: item.depth, href: item.href, title: item.title })),
    [
      { depth: 2, href: `#${SANITIZED_HEADING_ID_PREFIX}intro`, title: "Intro" },
      { depth: 3, href: `#${SANITIZED_HEADING_ID_PREFIX}detail`, title: "Detail" },
      { depth: 2, href: `#${SANITIZED_HEADING_ID_PREFIX}outro`, title: "Outro" },
    ]
  );
});

test("extractMdxHeadings dedupes slug like github-slugger", () => {
  const source = `## Same\n\n## Same\n`;
  const items = extractMdxHeadings(source);

  assert.equal(items.length, 2);
  assert.equal(items[0].href, `#${SANITIZED_HEADING_ID_PREFIX}same`);
  assert.equal(items[1].href, `#${SANITIZED_HEADING_ID_PREFIX}same-1`);
});

test("extractMdxHeadings respects minDepth", () => {
  const source = `# One\n\n## Two\n`;
  const items = extractMdxHeadings(source, { minDepth: 1 });

  assert.equal(items.length, 2);
  assert.equal(items[0].title, "One");
});
