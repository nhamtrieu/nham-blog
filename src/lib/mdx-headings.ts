import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/** Matches `clobberPrefix` on `id` / `name` in `hast-util-sanitize` default schema. */
export const SANITIZED_HEADING_ID_PREFIX = "user-content-";

export type MdxHeadingItem = {
  depth: Heading["depth"];
  title: string;
  /** Fragment including sanitize prefix, e.g. `#user-content-introduction` */
  href: string;
};

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);

function isHeadingDepth(value: number): value is Heading["depth"] {
  return value >= 1 && value <= 6;
}

/**
 * Walks MDX (markdown + JSX) and collects headings in document order.
 * Slugs match `rehype-slug` + default `rehype-sanitize` id prefix.
 */
export function extractMdxHeadings(source: string, options?: { minDepth?: number }) {
  const minDepth = options?.minDepth ?? 2;
  const tree = parser.parse(source) as Root;
  const slugger = new GithubSlugger();
  const items: MdxHeadingItem[] = [];

  visit(tree, "heading", (node: Heading) => {
    if (!isHeadingDepth(node.depth) || node.depth < minDepth) {
      return;
    }

    const title = toString(node).trim();

    if (!title) {
      return;
    }

    const slug = slugger.slug(title);
    if (!slug) {
      return;
    }

    items.push({
      depth: node.depth,
      title,
      href: `#${SANITIZED_HEADING_ID_PREFIX}${slug}`,
    });
  });

  return items;
}
