import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PostListItem } from "@/services/post.service";

function formatPublishedDate(value: Date | null) {
  if (!value) {
    return "Chưa có ngày publish";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export type PublishedPostFeedProps = {
  items: PostListItem[];
  nextCursor: string | null;
  hasActiveCursor: boolean;
  /** First page URL, e.g. `/` or `/tags/my-tag` (no query string). */
  basePath: string;
  emptyState: {
    title: string;
    description: string;
  };
};

export function PublishedPostFeed({
  items,
  nextCursor,
  hasActiveCursor,
  basePath,
  emptyState,
}: PublishedPostFeedProps) {
  const nextPageHref = nextCursor
    ? `${basePath}?${new URLSearchParams({ cursor: nextCursor }).toString()}`
    : null;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-5">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-foreground">{emptyState.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyState.description}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((post) => (
            <article
              key={post.id}
              className="group rounded-xl border border-border bg-muted/30 p-5 transition hover:border-primary/40 hover:bg-muted/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
                  Published
                </span>
                <span className="text-xs text-muted-foreground">{formatPublishedDate(post.publishedAt)}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground transition group-hover:text-primary">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {post.excerpt ?? "Bài viết đã sẵn sàng trên trang public site. Chi tiết sẽ có ở trang /blog/[slug]."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                    href={`/tags/${tag.slug}`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{post.readingTime} phút đọc</span>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full border-input px-3 py-1.5 text-xs font-semibold"
                  )}
                  href={`/blog/${post.slug}`}
                >
                  Xem bài viết
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {hasActiveCursor ? (
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
            href={basePath}
          >
            Quay lại trang đầu
          </Link>
        ) : null}
        {nextPageHref ? (
          <Link
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "rounded-full")}
            href={nextPageHref}
          >
            Tải thêm bài viết
          </Link>
        ) : items.length > 0 ? (
          <span className="text-sm text-muted-foreground">Bạn đã đến trang cuối cùng.</span>
        ) : null}
      </div>
    </section>
  );
}
