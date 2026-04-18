const DEFAULT_FALLBACK_SLUG = "untitled";

function normalizeSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (character) => (character === "đ" ? "d" : "D"))
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugify(value: string, fallback = DEFAULT_FALLBACK_SLUG) {
  const normalizedSlug = normalizeSlugPart(value);

  if (normalizedSlug.length > 0) {
    return normalizedSlug;
  }

  const normalizedFallback = normalizeSlugPart(fallback);

  if (normalizedFallback.length > 0) {
    return normalizedFallback;
  }

  return DEFAULT_FALLBACK_SLUG;
}

type CreateUniqueSlugOptions = {
  currentSlug?: string | null;
  fallback?: string;
};

export function createUniqueSlug(
  value: string,
  existingSlugs: Iterable<string>,
  options: CreateUniqueSlugOptions = {}
) {
  const baseSlug = slugify(value, options.fallback);
  const normalizedExistingSlugs = new Set(
    Array.from(existingSlugs, (slug) => slug.trim().toLowerCase()).filter(Boolean)
  );

  if (options.currentSlug) {
    normalizedExistingSlugs.delete(options.currentSlug.trim().toLowerCase());
  }

  if (!normalizedExistingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (normalizedExistingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}
