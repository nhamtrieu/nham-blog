const DEFAULT_WORDS_PER_MINUTE = 200;

function stripFrontmatter(content: string) {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function stripMdxSyntax(content: string) {
  return content
    .replace(/^import\s.+$/gm, " ")
    .replace(/^export\s.+$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/`([^`]+)`/g, " $1 ")
    .replace(/<\/?[^>\n]+\/?>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}(#{1,6})\s+/gm, "")
    .replace(/^\s*([-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]/g, " ");
}

export function extractReadableTextFromMdx(content: string) {
  return stripMdxSyntax(stripFrontmatter(content))
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

export function countWordsInMdx(content: string) {
  const readableText = extractReadableTextFromMdx(content);
  const matches = readableText.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);

  return matches?.length ?? 0;
}

export function calculateReadingTimeFromMdx(
  content: string,
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE
) {
  const wordCount = countWordsInMdx(content);

  if (wordCount === 0) {
    return 0;
  }

  return Math.ceil(wordCount / wordsPerMinute);
}
