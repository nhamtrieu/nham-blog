import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BlogCategoryFilter,
  BlogPostGrid,
} from "@/components/blog/blog-post-grid";
import { siteConfig } from "@/config/site";
import { SERVICE_ERROR_CODES, isServiceError, postService, tagService } from "@/services";
import type { TagListItem } from "@/services/tag.service";

type BlogIndexPageProps = {
  searchParams?: Promise<{
    cursor?: string | string[];
    tag?: string | string[];
    q?: string | string[];
  }>;
};

function resolveSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export const metadata: Metadata = {
  title: `Blog | ${siteConfig.name}`,
  description: `Danh sách bài viết trên ${siteConfig.name}.`,
};

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const cursor = resolveSearchParam(resolvedSearchParams.cursor)?.trim();
  const tagSlug = resolveSearchParam(resolvedSearchParams.tag)?.trim().toLowerCase() || null;
  const searchQuery = resolveSearchParam(resolvedSearchParams.q)?.trim() || null;

  const tags = await tagService.listTags();
  let activeTag: TagListItem | null = null;

  if (tagSlug) {
    activeTag = tags.find((tag) => tag.slug === tagSlug) ?? null;

    if (!activeTag) {
      try {
        activeTag = await tagService.getTagBySlug(tagSlug);
      } catch (error) {
        if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
          notFound();
        }

        throw error;
      }
    }
  }

  const publishedPosts = activeTag
    ? await postService.listPublishedPostsForTag({
      tagId: activeTag.id,
      cursor,
      limit: 12,
    })
    : await postService.listPublishedPosts({
      cursor,
      limit: 12,
      search: searchQuery ?? undefined,
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Blog</h1>
          {searchQuery && !activeTag ? (
            <p className="text-sm text-muted-foreground">
              Kết quả cho &quot;{searchQuery}&quot;
            </p>
          ) : null}
        </div>
        <BlogCategoryFilter activeTagSlug={activeTag?.slug ?? null} tags={tags} />
      </section>

      <section className="mt-8">
        <BlogPostGrid
          activeTagSlug={activeTag?.slug ?? null}
          basePath="/blog"
          emptyDescription={
            activeTag
              ? `Chưa có bài publish với chủ đề “${activeTag.name}”.`
              : searchQuery
                ? `Không tìm thấy bài viết khớp “${searchQuery}”.`
                : "Publish bài đầu tiên từ trang admin để hiện tại đây."
          }
          emptyTitle={
            activeTag
              ? "Chưa có bài viết cho chủ đề này"
              : searchQuery
                ? "Không có kết quả"
                : "Chưa có bài viết"
          }
          hasActiveCursor={Boolean(cursor)}
          nextCursor={publishedPosts.pageInfo.nextCursor}
          posts={publishedPosts.items}
          searchQuery={searchQuery}
        />
      </section>
    </main>
  );
}
