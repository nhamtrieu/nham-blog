import Link from "next/link";

import { PostCover } from "@/components/blog/post-cover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PostListItem } from "@/services/post.service";
import type { TagListItem } from "@/services/tag.service";

type BlogCategoryFilterProps = {
  tags: TagListItem[];
  activeTagSlug: string | null;
};

export function BlogCategoryFilter({ tags, activeTagSlug }: BlogCategoryFilterProps) {
  const filters = [
    { slug: null as string | null, label: "All", href: "/blog" },
    ...tags.map((tag) => ({
      slug: tag.slug,
      label: tag.name,
      href: `/blog?tag=${encodeURIComponent(tag.slug)}`,
    })),
  ];

  return (
    <nav
      aria-label="Lọc theo chủ đề"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {filters.map((filter) => {
        const isActive = filter.slug === activeTagSlug;

        return (
          <Link
            key={filter.slug ?? "all"}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            href={filter.href}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

type BlogPostCardProps = {
  post: PostListItem;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="group flex h-full flex-col">
      <Link className="block" href={`/blog/${post.slug}`}>
        <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-border/50 bg-muted">
          <PostCover coverImageUrl={post.coverImageUrl} title={post.title} />
        </div>
        <h2 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-foreground transition group-hover:text-primary sm:text-[1.05rem]">
          {post.title}
        </h2>
      </Link>
      {post.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Link
              key={tag.id}
              className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              href={`/blog?tag=${encodeURIComponent(tag.slug)}`}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

type BlogPostGridProps = {
  posts: PostListItem[];
  emptyTitle: string;
  emptyDescription: string;
  basePath: string;
  nextCursor: string | null;
  hasActiveCursor: boolean;
  activeTagSlug: string | null;
  searchQuery?: string | null;
};

function buildPageHref(
  basePath: string,
  params: { tag?: string | null; cursor?: string | null; q?: string | null }
) {
  const search = new URLSearchParams();

  if (params.tag) {
    search.set("tag", params.tag);
  }

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.cursor) {
    search.set("cursor", params.cursor);
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function BlogPostGrid({
  posts,
  emptyTitle,
  emptyDescription,
  basePath,
  nextCursor,
  hasActiveCursor,
  activeTagSlug,
  searchQuery = null,
}: BlogPostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  const nextPageHref = nextCursor
    ? buildPageHref(basePath, {
      tag: activeTagSlug,
      cursor: nextCursor,
      q: activeTagSlug ? null : searchQuery,
    })
    : null;
  const firstPageHref = buildPageHref(basePath, {
    tag: activeTagSlug,
    q: activeTagSlug ? null : searchQuery,
  });

  return (
    <div className="space-y-10">
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasActiveCursor ? (
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
            href={firstPageHref}
          >
            Quay lại trang đầu
          </Link>
        ) : null}
        {nextPageHref ? (
          <Link
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-full px-8")}
            href={nextPageHref}
          >
            Xem thêm
          </Link>
        ) : null}
      </div>
    </div>
  );
}
