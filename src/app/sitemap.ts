import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/absolute-url";
import { postService, tagService } from "@/services";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([
    postService.listPublishedPostsForSitemap(),
    tagService.listTags(),
  ]);
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...tags.map((tag) => ({
      url: absoluteUrl(`/blog?tag=${encodeURIComponent(tag.slug)}`),
      lastModified: tag.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    })),
  ];
}
