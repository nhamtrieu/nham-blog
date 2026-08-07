import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bookmark, FileText, Heart, Layers, UserRound } from "lucide-react";

import {
  BlogCategoryFilter,
  BlogPostGrid,
} from "@/components/blog/blog-post-grid";
import { siteConfig } from "@/config/site";
import {
  SERVICE_ERROR_CODES,
  authorService,
  isServiceError,
  postService,
  tagService,
} from "@/services";
import type { TagListItem } from "@/services/tag.service";

type AuthorPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    cursor?: string | string[];
    tag?: string | string[];
  }>;
};

function resolveSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { userId } = await params;

  try {
    const author = await authorService.getPublicAuthorProfile(userId);
    const name = author.name?.trim() || "Tác giả";

    return {
      title: `${name} | ${siteConfig.name}`,
      description: author.bio?.trim() || `Bài viết của ${name} trên ${siteConfig.name}.`,
    };
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      return {
        title: `Tác giả | ${siteConfig.name}`,
      };
    }

    throw error;
  }
}

export default async function AuthorPage({ params, searchParams }: AuthorPageProps) {
  const { userId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const cursor = resolveSearchParam(resolvedSearchParams.cursor)?.trim();
  const tagSlug = resolveSearchParam(resolvedSearchParams.tag)?.trim().toLowerCase() || null;
  const basePath = `/authors/${userId}`;

  let author;

  try {
    author = await authorService.getPublicAuthorProfile(userId);
  } catch (error) {
    if (isServiceError(error) && error.code === SERVICE_ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }

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
      authorId: author.id,
      cursor,
      limit: 12,
    })
    : await postService.listPublishedPosts({
      authorId: author.id,
      cursor,
      limit: 12,
    });

  const displayName = author.name?.trim() || "Tác giả";
  const stats = [
    {
      icon: FileText,
      label: `${formatCount(author.stats.postCount)} bài viết`,
    },
    {
      icon: Layers,
      label: `${formatCount(author.stats.seriesCount)} series`,
    },
    {
      icon: Heart,
      label: `${formatCount(author.stats.likeCount)} lượt thích`,
    },
    {
      icon: Bookmark,
      label: `${formatCount(author.stats.saveCount)} lượt lưu`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-56 xl:w-64">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-primary bg-muted text-muted-foreground sm:size-32">
              {author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="size-full object-cover" src={author.avatarUrl} />
              ) : (
                <UserRound className="size-12" strokeWidth={1.5} />
              )}
            </div>

            <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">{displayName}</h1>

            <ul className="mt-5 w-full space-y-2.5 text-sm text-muted-foreground">
              {stats.map((stat) => (
                <li key={stat.label} className="flex items-center justify-center gap-2.5 lg:justify-start">
                  <stat.icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>

            {author.bio?.trim() ? (
              <section className="mt-8 w-full text-left">
                <h2 className="text-sm font-bold text-foreground">Về tôi</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {author.bio.trim()}
                </p>
              </section>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Bài viết</h2>
            <BlogCategoryFilter
              activeTagSlug={activeTag?.slug ?? null}
              basePath={basePath}
              tags={tags}
            />
          </div>

          <BlogPostGrid
            activeTagSlug={activeTag?.slug ?? null}
            basePath={basePath}
            emptyDescription={
              activeTag
                ? `Chưa có bài publish với chủ đề “${activeTag.name}”.`
                : "Tác giả chưa có bài viết nào được publish."
            }
            emptyTitle={
              activeTag ? "Chưa có bài viết cho chủ đề này" : "Chưa có bài viết"
            }
            hasActiveCursor={Boolean(cursor)}
            nextCursor={publishedPosts.pageInfo.nextCursor}
            posts={publishedPosts.items}
          />
        </section>
      </div>
    </main>
  );
}
