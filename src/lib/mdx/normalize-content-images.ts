/**
 * MDXEditor often serializes resized images as JSX/HTML `<img … />`.
 * rehype-sanitize drops MDX JSX nodes, so those images vanish on the public page.
 * Convert them to markdown images, preserving size in the title as `WIDTHxHEIGHT`.
 */
export function normalizeMdxHtmlImages(source: string): string {
  return source.replace(/<img\b([^>]*?)\s*\/?>/gi, (_match, rawAttrs: string) => {
    const src = extractAttr(rawAttrs, "src");

    if (!src || !isSafeImageUrl(src)) {
      return "";
    }

    const alt = extractAttr(rawAttrs, "alt") ?? "";
    const width = normalizeDimension(extractAttr(rawAttrs, "width"));
    const height = normalizeDimension(extractAttr(rawAttrs, "height"));
    const sizeTitle =
      width || height ? ` "${width ?? ""}x${height ?? ""}"` : "";

    return `![${escapeMarkdownAlt(alt)}](${src}${sizeTitle})`;
  });
}

/** Parse `400x300` (or `400x` / `x300`) from markdown image title. */
export function parseImageSizeTitle(title: string | null | undefined): {
  width?: number;
  height?: number;
} {
  if (!title) {
    return {};
  }

  const match = /^(\d*)x(\d*)$/.exec(title.trim());

  if (!match) {
    return {};
  }

  const width = match[1] ? Number(match[1]) : undefined;
  const height = match[2] ? Number(match[2]) : undefined;

  return {
    width: width && Number.isFinite(width) ? width : undefined,
    height: height && Number.isFinite(height) ? height : undefined,
  };
}

function normalizeDimension(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === "inherit" || trimmed === "auto") {
    return null;
  }

  const numeric = Number.parseFloat(trimmed);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return String(Math.round(numeric));
}

function extractAttr(attrs: string, name: string) {
  const doubleQuoted = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs);
  if (doubleQuoted?.[1] !== undefined) {
    return doubleQuoted[1];
  }

  const singleQuoted = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i").exec(attrs);
  if (singleQuoted?.[1] !== undefined) {
    return singleQuoted[1];
  }

  return null;
}

function isSafeImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeMarkdownAlt(value: string) {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}
